import { resolve } from "node:path";
import { includesAll, readSource } from "./invariant-helpers";

const root = resolve(import.meta.dirname, "..");
const editor = await readSource(resolve(root, "src/app/markdown-editor.tsx"));
const app = await readSource(resolve(root, "src/app/main.tsx"));
const driveApi = await readSource(resolve(root, "src/background/drive-api.ts"));
const background = await readSource(resolve(root, "src/background/index.ts"));
const messages = await readSource(resolve(root, "src/shared/messages.ts"));
const failures: string[] = [];

expect(editor.includes("event.clipboardData?.files"), "Editor paste handler must inspect clipboard files.");
expect(editor.includes("file.type.startsWith(\"image/\")"), "Editor paste/drop must filter image files.");
expect(editor.includes("getProps().onImageFiles(files)"), "Editor must delegate pasted or dropped images to the app.");
expect(editor.includes("event.dataTransfer?.files"), "Editor drop handler must inspect dropped files.");
expect(editor.includes("event.clipboardData?.getData(\"text/html\")"), "Editor paste handler must inspect HTML clipboard content.");
expect(editor.includes("getProps().onSmartHtmlPaste(html)"), "Editor must delegate HTML paste for conversion.");
expect(editor.includes("event.clipboardData?.getData(\"text/plain\")"), "Editor paste handler must inspect plain text URLs.");
expect(editor.includes("const pastedUrl = normalizePastedHttpUrl(text)") && editor.includes("selection && pastedUrl && selection.from !== selection.to"), "Editor must turn validated pasted URLs over selections into Markdown links.");
expect(editor.includes("insert: `[${label}](${pastedUrl})`"), "Editor must insert normalized Markdown links for smart URL paste.");

expect(app.includes("new TurndownService({ headingStyle: \"atx\", codeBlockStyle: \"fenced\" })"), "App must convert HTML paste through Turndown.");
expect(app.includes("editorRef.current?.insertText(turndown.turndown(html))"), "App must insert converted HTML paste into the editor.");
expect(app.includes("title: \"HTML paste failed\""), "HTML paste conversion failures must show user feedback.");
expect(app.includes("}, [pushToast]);"), "HTML paste conversion must keep the toast dependency.");
expect(app.includes("const uploadImages = useCallback"), "App must define image upload handling.");
expect(app.includes("const maxImageUploadBytes = 10 * 1024 * 1024"), "App must cap pasted or dropped image upload size.");
expect(app.includes("if (file.size > maxImageUploadBytes)") && app.includes("Images must be 10 MB or smaller."), "Oversized image uploads must be rejected with user feedback before FileReader runs.");
expect(app.includes("readFileAsDataUrl(file)"), "App must read image files as data URLs.");
expect(app.includes("type: \"drive:upload-image\""), "App must send image uploads through the Drive message.");
expect(app.includes("folderId: document.folderId"), "Image upload must preserve the current Drive folder context.");
expect(app.includes("editorRef.current?.insertText(`\\n${response.imageMarkdown}\\n`)"), "Uploaded image references must be inserted into the editor.");
expect(app.includes("pushToast({ tone: \"success\", title: \"Image uploaded\" })"), "Successful image uploads must show feedback.");
expect(app.includes("pushToast({ tone: \"danger\", title: \"Image upload failed\""), "Image upload failures must show feedback.");
expect(includesAll(app, ["} catch (failure) {", "pushToast({ tone: \"danger\", title: \"Image upload failed\", detail: describeUnknownError(failure) });"]), "Image upload runtime failures must show user feedback.");

expect(messages.includes("{ type: \"drive:upload-image\"; name: string; mimeType: string; dataUrl: string; folderId: string | null }"), "Message contract must include image upload requests.");
expect(messages.includes("{ ok: true; imageMarkdown: string }"), "Message contract must include image markdown responses.");
expect(background.includes("request.type === \"drive:upload-image\""), "Background must route image upload requests.");
expect(background.includes("imageMarkdown: await uploadImage"), "Background must return image markdown from Drive upload.");

expect(driveApi.includes("async function ensureImagesFolder"), "Drive API must ensure the MarkDrive Images folder.");
expect(driveApi.includes("name = ${driveQueryLiteral(\"MarkDrive Images\")}"), "Drive API must search for the MarkDrive Images folder with a safely quoted query literal.");
expect(driveApi.includes("name: \"MarkDrive Images\""), "Drive API must create the MarkDrive Images folder when missing.");
expect(driveApi.includes("parents: [parent]"), "Drive image folder must be created in the current folder or root.");
expect(driveApi.includes("decodeImageDataUrl(dataUrl, mimeType)"), "Drive image upload must validate and decode data URLs.");
expect(driveApi.includes("function decodeImageDataUrl(dataUrl: string, mimeType: string)"), "Drive image data URL validation must be centralized.");
expect(driveApi.includes("contentType.startsWith(\"image/\")"), "Drive image upload must reject non-image data URLs.");
expect(driveApi.includes("mimeType.toLowerCase() !== contentType"), "Drive image upload must reject mismatched MIME types.");
expect(driveApi.includes("binary = atob(match[2])") && driveApi.includes("catch") && driveApi.includes("throw new DriveApiError(400, \"Invalid image data URL.\")"), "Drive image upload must convert invalid base64 into a structured error.");
expect(driveApi.includes("if (binary.length === 0) throw new DriveApiError(400, \"Image upload is empty.\");"), "Drive image upload must reject empty image data.");
expect(driveApi.includes("binary = atob(match[2]);") && driveApi.includes("new Uint8Array(binary.length)"), "Drive image upload must convert validated base64 image data.");
expect(driveApi.includes("uploadType=multipart"), "Drive image upload must use multipart upload.");
expect(driveApi.includes("new Blob([bytes], { type: contentType })"), "Drive image upload must preserve validated image MIME type.");
expect(driveApi.includes("name: normalizeDriveAssetName(name)"), "Drive image upload must normalize uploaded image file names.");
expect(driveApi.includes("escapeMarkdownAltText(created.name)"), "Drive image upload must escape image names before inserting Markdown alt text.");
expect(driveApi.includes("encodeURIComponent(created.id)"), "Drive image upload must URL-encode Drive file IDs in Markdown references.");
expect(driveApi.includes("replace(/[\\r\\n]+/g, \" \")") && driveApi.includes("replace(/\\[/g, \"\\\\[\")") && driveApi.includes("replace(/\\]/g, \"\\\\]\")"), "Drive image upload must sanitize Markdown alt text control characters.");
expect(driveApi.includes("https://drive.google.com/uc?export=view&id=${encodeURIComponent(created.id)}"), "Drive image upload must return a direct Drive image reference.");

if (failures.length > 0) {
  console.error(failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

console.log("Media and paste invariants passed.");

function expect(condition: boolean, message: string): void {
  if (!condition) failures.push(message);
}
