import { createBrowserRouter } from "react-router";
import Layout from "./components/Layout";
import TimestampTool from "./components/tools/TimestampTool";
import Base64Tool from "./components/tools/Base64Tool";
import JsonTool from "./components/tools/JsonTool";
import UrlTool from "./components/tools/UrlTool";
import QrCodeTool from "./components/tools/QrCodeTool";
import NumberBaseTool from "./components/tools/NumberBaseTool";
import JwtTool from "./components/tools/JwtTool";
import CaseConverterTool from "./components/tools/CaseConverterTool";
import CalendarTool from "./components/tools/calendar/CalendarTool";
import BookmarksTool from "./components/tools/BookmarksTool";
import ClipboardTool from "./components/tools/ClipboardTool";
import DiffTool from "./components/tools/DiffTool";
import TranscriptTool from "./components/tools/transcript/TranscriptTool";
import LoginPage from "./components/LoginPage";

import { CaseConverterRedirect } from "./components/CaseConverterRedirect";

export const router = createBrowserRouter([
  {
    path: "/login",
    Component: LoginPage,
  },
  {
    path: "/",
    Component: Layout,
    children: [
      { index: true, Component: CaseConverterTool },
      { path: "case-converter", Component: CaseConverterRedirect },
      { path: "clipboard", Component: ClipboardTool },
      { path: "timestamp", Component: TimestampTool },
      { path: "url", Component: UrlTool },
      { path: "qrcode", Component: QrCodeTool },
      { path: "number-base", Component: NumberBaseTool },
      { path: "base64", Component: Base64Tool },
      { path: "jwt", Component: JwtTool },
      { path: "json", Component: JsonTool },
      { path: "calendar", Component: CalendarTool },
      { path: "bookmarks", Component: BookmarksTool },
      { path: "diff", Component: DiffTool },
      { path: "transcript", Component: TranscriptTool },
    ],
  },
]);
