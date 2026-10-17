import { useState, useRef, useCallback, useMemo } from "react";

interface JsonTreeViewProps {
  data: unknown;
  showLineNumbers: boolean;
  defaultCollapsed?: boolean;
  onDataChange?: (newData: unknown) => void;
}

// ---- Pure helpers ----

function parseEditedValue(raw: string): unknown {
  const trimmed = raw.trim();
  if (trimmed === "null") return null;
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (/^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(trimmed)) return Number(trimmed);
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return trimmed.slice(1, -1);
    }
  }
  return raw;
}

function setAtPath(root: unknown, path: (string | number)[], val: unknown): unknown {
  if (path.length === 0) return val;
  const [head, ...rest] = path;
  if (Array.isArray(root)) {
    const arr = [...root];
    arr[head as number] = setAtPath(arr[head as number], rest, val);
    return arr;
  }
  if (root !== null && typeof root === "object") {
    return { ...(root as Record<string, unknown>), [head]: setAtPath((root as Record<string, unknown>)[head as string], rest, val) };
  }
  return root;
}

function renameKeyAtPath(root: unknown, path: (string | number)[], oldKey: string, newKey: string): unknown {
  if (path.length === 0) {
    if (root !== null && typeof root === "object" && !Array.isArray(root)) {
      const obj = root as Record<string, unknown>;
      const result: Record<string, unknown> = {};
      for (const k of Object.keys(obj)) {
        result[k === oldKey ? newKey : k] = obj[k];
      }
      return result;
    }
    return root;
  }
  const [head, ...rest] = path;
  if (Array.isArray(root)) {
    const arr = [...root];
    arr[head as number] = renameKeyAtPath(arr[head as number], rest, oldKey, newKey);
    return arr;
  }
  if (root !== null && typeof root === "object") {
    return { ...(root as Record<string, unknown>), [head]: renameKeyAtPath((root as Record<string, unknown>)[head as string], rest, oldKey, newKey) };
  }
  return root;
}

// ---- Pre-compute line numbers (pure function, no React rendering involved) ----

function computeLineNumbers(
  value: unknown,
  pathKey: string,
  depth: number,
  isCollapsed: (pk: string, d: number) => boolean,
  counter: { v: number },
  out: Map<string, number>,
) {
  const isObject = value !== null && typeof value === "object" && !Array.isArray(value);
  const isArray = Array.isArray(value);
  const isExpandable = isObject || isArray;

  if (!isExpandable) {
    out.set(pathKey, ++counter.v);
    return;
  }

  if (isCollapsed(pathKey, depth)) {
    out.set(pathKey, ++counter.v);
    return;
  }

  // open bracket line
  out.set(pathKey + ":open", ++counter.v);

  const entries = isArray
    ? (value as unknown[]).map((v, i) => ({ childPk: `${pathKey}.${i}`, childVal: v }))
    : Object.entries(value as Record<string, unknown>).map(([k, v]) => ({ childPk: `${pathKey}.${k}`, childVal: v }));

  for (const { childPk, childVal } of entries) {
    computeLineNumbers(childVal, childPk, depth + 1, isCollapsed, counter, out);
  }

  // close bracket line
  out.set(pathKey + ":close", ++counter.v);
}

// ---- UI components ----

function LineNum({ show, num }: { show: boolean; num: number }) {
  if (!show) return null;
  return (
    <span
      className="shrink-0 w-8 text-right pr-2 text-gray-400 select-none text-xs font-mono"
      style={{ fontVariantNumeric: "tabular-nums" }}
    >
      {num}
    </span>
  );
}

function EditableValue({
  value,
  display,
  onCommit,
}: {
  value: string;
  display: React.ReactNode;
  onCommit: (newRaw: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const commit = useCallback(() => {
    setEditing(false);
    const raw = inputRef.current?.value ?? value;
    if (raw !== value) onCommit(raw);
  }, [value, onCommit]);

  if (editing) {
    return (
      <input
        ref={inputRef}
        defaultValue={value}
        className="bg-yellow-50 border border-yellow-300 rounded px-1 outline-none text-inherit font-mono"
        style={{ minWidth: 40, width: `${Math.max(value.length + 1, 3)}ch` }}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") setEditing(false);
        }}
        autoFocus
      />
    );
  }

  return (
    <span
      className="cursor-text hover:bg-yellow-50 rounded px-0.5"
      onClick={() => {
        setEditing(true);
        requestAnimationFrame(() => inputRef.current?.select());
      }}
    >
      {display}
    </span>
  );
}

function Line({
  showLineNumbers,
  num,
  depth,
  children,
}: {
  showLineNumbers: boolean;
  num: number;
  depth: number;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline leading-6 whitespace-nowrap">
      <LineNum show={showLineNumbers} num={num} />
      <div style={{ paddingLeft: depth * 20 }}>{children}</div>
    </div>
  );
}

interface NodeProps {
  name?: string;
  value: unknown;
  isLast: boolean;
  depth: number;
  showLineNumbers: boolean;
  pathKey: string;
  path: (string | number)[];
  lineMap: Map<string, number>;
  isCollapsed: (pk: string, d: number) => boolean;
  onToggle: (pk: string, d: number) => void;
  onUpdate: (path: (string | number)[], newValue: unknown) => void;
  onRenameKey: (parentPath: (string | number)[], oldKey: string, newKey: string) => void;
}

function JsonNode({
  name,
  value,
  isLast,
  depth,
  showLineNumbers,
  pathKey,
  path,
  lineMap,
  isCollapsed,
  onToggle,
  onUpdate,
  onRenameKey,
}: NodeProps) {
  const isObject = value !== null && typeof value === "object" && !Array.isArray(value);
  const isArray = Array.isArray(value);
  const isExpandable = isObject || isArray;
  const comma = isLast ? "" : ",";

  const keyPart = name !== undefined && (
    <>
      <EditableValue
        value={name}
        display={<span className="text-red-800">"{name}"</span>}
        onCommit={(raw) => {
          if (raw !== name) onRenameKey(path.slice(0, -1), name, raw);
        }}
      />
      <span className="text-gray-600">: </span>
    </>
  );

  // Leaf
  if (!isExpandable) {
    const ln = lineMap.get(pathKey) ?? 0;
    const displayValue =
      value === null ? (
        <span className="text-orange-500">null</span>
      ) : typeof value === "boolean" ? (
        <span className="text-orange-500">{String(value)}</span>
      ) : typeof value === "number" ? (
        <span className="text-blue-600">{String(value)}</span>
      ) : (
        <span className="text-green-700">"{String(value)}"</span>
      );
    const rawValue = typeof value === "string" ? `"${value}"` : String(value);

    return (
      <Line showLineNumbers={showLineNumbers} num={ln} depth={depth}>
        <span className="inline-block w-5" />
        {keyPart}
        <EditableValue
          value={rawValue}
          display={displayValue}
          onCommit={(raw) => onUpdate(path, parseEditedValue(raw))}
        />
        <span className="text-gray-600">{comma}</span>
      </Line>
    );
  }

  // Expandable
  const entries = isArray
    ? (value as unknown[]).map((v, i) => ({
        key: String(i),
        value: v,
        childName: undefined as string | undefined,
        childPath: [...path, i],
        childPathKey: `${pathKey}.${i}`,
      }))
    : Object.entries(value as Record<string, unknown>).map(([k, v]) => ({
        key: k,
        value: v,
        childName: k,
        childPath: [...path, k],
        childPathKey: `${pathKey}.${k}`,
      }));

  const openBracket = isArray ? "[" : "{";
  const closeBracket = isArray ? "]" : "}";
  const collapsed = isCollapsed(pathKey, depth);

  if (collapsed) {
    const ln = lineMap.get(pathKey) ?? 0;
    return (
      <Line showLineNumbers={showLineNumbers} num={ln} depth={depth}>
        <button
          onClick={() => onToggle(pathKey, depth)}
          className="inline-flex items-center justify-center w-4 h-4 rounded-sm border border-gray-300 text-gray-500 hover:bg-gray-100 text-[10px] leading-none mr-1 cursor-pointer align-middle"
        >
          +
        </button>
        {keyPart}
        <span className="text-gray-600">
          {openBracket}...{closeBracket}{comma}
        </span>
        <span className="text-gray-400 text-xs ml-2">
          // {entries.length} {isArray ? "items" : "keys"}
        </span>
      </Line>
    );
  }

  const openLn = lineMap.get(pathKey + ":open") ?? 0;
  const closeLn = lineMap.get(pathKey + ":close") ?? 0;

  return (
    <div>
      <Line showLineNumbers={showLineNumbers} num={openLn} depth={depth}>
        <button
          onClick={() => onToggle(pathKey, depth)}
          className="inline-flex items-center justify-center w-4 h-4 rounded-sm border border-gray-300 text-gray-500 hover:bg-gray-100 text-[10px] leading-none mr-1 cursor-pointer align-middle"
        >
          −
        </button>
        {keyPart}
        <span className="text-gray-600">{openBracket}</span>
      </Line>
      {entries.map((entry, i) => (
        <JsonNode
          key={entry.key}
          name={entry.childName}
          value={entry.value}
          isLast={i === entries.length - 1}
          depth={depth + 1}
          showLineNumbers={showLineNumbers}
          pathKey={entry.childPathKey}
          path={entry.childPath}
          lineMap={lineMap}
          isCollapsed={isCollapsed}
          onToggle={onToggle}
          onUpdate={onUpdate}
          onRenameKey={onRenameKey}
        />
      ))}
      <Line showLineNumbers={showLineNumbers} num={closeLn} depth={depth}>
        <span className="inline-block w-5" />
        <span className="text-gray-600">{closeBracket}{comma}</span>
      </Line>
    </div>
  );
}

// ---- Root ----

export default function JsonTreeView({
  data,
  showLineNumbers,
  defaultCollapsed = false,
  onDataChange,
}: JsonTreeViewProps) {
  const [collapsedMap, setCollapsedMap] = useState<Record<string, boolean>>({});

  const getCollapsed = useCallback(
    (pathKey: string, depth: number): boolean => {
      if (pathKey in collapsedMap) return collapsedMap[pathKey];
      return defaultCollapsed && depth > 0;
    },
    [collapsedMap, defaultCollapsed],
  );

  const onToggle = useCallback(
    (pathKey: string, depth: number) => {
      setCollapsedMap((prev) => ({
        ...prev,
        [pathKey]: !(pathKey in prev ? prev[pathKey] : defaultCollapsed && depth > 0),
      }));
    },
    [defaultCollapsed],
  );

  // Pre-compute ALL line numbers in one pass (pure, no rendering side-effects)
  const lineMap = useMemo(() => {
    const map = new Map<string, number>();
    computeLineNumbers(data, "$", 0, getCollapsed, { v: 0 }, map);
    return map;
  }, [data, getCollapsed]);

  const handleUpdate = useCallback(
    (path: (string | number)[], newValue: unknown) => {
      if (!onDataChange) return;
      onDataChange(setAtPath(data, path, newValue));
    },
    [data, onDataChange],
  );

  const handleRenameKey = useCallback(
    (parentPath: (string | number)[], oldKey: string, newKey: string) => {
      if (!onDataChange) return;
      onDataChange(renameKeyAtPath(data, parentPath, oldKey, newKey));
    },
    [data, onDataChange],
  );

  return (
    <div className="font-mono text-[13px] md:text-[14px] overflow-auto">
      <JsonNode
        value={data}
        isLast={true}
        depth={0}
        showLineNumbers={showLineNumbers}
        pathKey="$"
        path={[]}
        lineMap={lineMap}
        isCollapsed={getCollapsed}
        onToggle={onToggle}
        onUpdate={handleUpdate}
        onRenameKey={handleRenameKey}
      />
    </div>
  );
}
