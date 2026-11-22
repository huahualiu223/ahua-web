const byId = (id) => document.getElementById(id);
const getJson = async (path) => {
  const response = await fetch(path);
  if (!response.ok) throw new Error(String(response.status));
  return response.json();
};

async function render() {
  const [site, data] = await Promise.all([
    getJson("/content/site.json"),
    getJson("/content/posts.json"),
  ]);
  document.title = site.name;
  document.querySelector(".brand").textContent = site.name;
  document.querySelector("#intro h1").textContent = site.name;
  byId("description").textContent = site.description;
  byId("bio").textContent = site.about;

  const posts = (data.posts ?? []).filter((post) => !post.draft)
    .sort((a, b) => b.date.localeCompare(a.date));
  const selected = new URLSearchParams(location.search).get("post");
  if (selected !== null) {
    const post = posts.find((entry) => entry.slug === selected);
    document.querySelectorAll("main > section").forEach((section) => section.hidden = true);
    const article = byId("article");
    article.hidden = false;
    article.querySelector("h1").textContent = post?.title ?? "文章未找到";
    if (post) {
      document.title = post.title + " · " + site.name;
      article.querySelector("time").textContent = post.date;
      byId("body").textContent = post.body;
    }
    return;
  }

  if (!posts.length) byId("post-status").textContent = "暂无文章";
  posts.forEach((post) => {
    const item = document.createElement("li");
    const link = document.createElement("a");
    const time = document.createElement("time");
    link.href = "/?post=" + encodeURIComponent(post.slug);
    link.textContent = post.title;
    time.dateTime = post.date;
    time.textContent = post.date;
    item.append(link, time);
    byId("post-list").append(item);
  });
}

render().catch(() => byId("post-status").textContent = "内容加载失败，请刷新页面重试。");
