export const prerender = true;

export function GET() {
  return Response.json({
    backend: {
      name: "github",
      repo: "huahualiu223/ahua-web",
      branch: "master",
    },
    media_folder: "public/uploads",
    public_folder: "/uploads",
    collections: [
      {
        name: "posts",
        label: "文章",
        folder: "src/content/posts",
        create: true,
        slug: "{{slug}}",
        fields: [
          { name: "title", label: "标题", widget: "string" },
          { name: "published", label: "发布日期", widget: "datetime", date_format: "YYYY-MM-DD", time_format: false, format: "YYYY-MM-DD" },
          { name: "description", label: "摘要", widget: "text", required: false },
          { name: "image", label: "封面", widget: "image", required: false },
          { name: "category", label: "分类", widget: "string", required: false },
          { name: "tags", label: "标签", widget: "list", required: false },
          { name: "draft", label: "草稿", widget: "boolean", default: true, required: false },
          { name: "body", label: "正文", widget: "markdown" },
        ],
      },
      {
        name: "pages",
        label: "页面",
        files: [{
          name: "about",
          label: "关于我",
          file: "src/content/spec/about.md",
          fields: [{ name: "body", label: "正文", widget: "markdown" }],
        }],
      },
    ],
  });
}
