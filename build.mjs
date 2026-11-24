import { copyFile, cp, mkdir, readFile, writeFile } from "node:fs/promises";

await mkdir("dist/content", { recursive: true });
for (const file of ["index.html", "style.css", "site.js"]) {
  await copyFile("public/" + file, "dist/" + file);
}
for (const route of ["about", "code", "notes", "gallery", "links"]) {
  await mkdir("dist/" + route, { recursive: true });
  await copyFile("public/index.html", "dist/" + route + "/index.html");
}
await cp("public/admin", "dist/admin", { recursive: true });
await mkdir("public/uploads", { recursive: true });
await cp("public/uploads", "dist/uploads", { recursive: true });
await copyFile("public/content/site.json", "dist/content/site.json");
const { posts } = JSON.parse((await readFile("public/content/posts.json", "utf8")).replace(/^\uFEFF/, ""));
const published = posts.filter((post) => !post.draft);
const slugs = new Set(published.map((post) => post.slug));
if (slugs.size !== published.length || slugs.has("")) {
  throw new Error("Published posts must have unique, non-empty link names.");
}
await writeFile("dist/content/posts.json", JSON.stringify({ posts: published }));
