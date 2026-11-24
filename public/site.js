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
  byId("initial").textContent = Array.from(site.name.trim())[0] ?? "✦";
  const setImage = (id, path) => {
    if (!path?.startsWith("/uploads/")) return;
    const img = byId(id);
    img.addEventListener("error", () => {
      img.hidden = true;
      if (id === "avatar") byId("initial").hidden = false;
    }, { once: true });
    img.src = path;
    img.hidden = false;
    if (id === "avatar") byId("initial").hidden = true;
  };
  setImage("avatar", site.avatar);
  setImage("wechat-qr", site.wechatQr);
  byId("wechat-name").textContent = site.wechatName ?? "";
  byId("wechat").hidden = !(site.wechatName || site.wechatQr?.startsWith("/uploads/"));

  const contacts = byId("contacts");
  const instagram = site.instagram?.trim().replace(/^@/, "");
  const links = [
    ["邮箱", site.email && "mailto:" + site.email],
    ["Instagram", instagram && /^[a-z0-9_.]+$/i.test(instagram) && "https://www.instagram.com/" + instagram + "/"],
    ...(site.links ?? []).map(({ label, url }) => [label, /^https:\/\//i.test(url) && url]),
  ];
  for (const [label, url] of links) {
    if (!label || !url) continue;
    const link = document.createElement("a");
    link.textContent = label;
    link.href = url;
    contacts.append(link);
  }
  contacts.hidden = !contacts.children.length;

  const posts = (data.posts ?? []).filter((post) => !post.draft)
    .sort((a, b) => b.date.localeCompare(a.date));
  const query = new URLSearchParams(location.search);
  const selected = query.get("post");
  if (selected !== null) {
    const back = new URLSearchParams();
    for (const key of ["month", "kind"]) {
      if (query.has(key)) back.set(key, query.get(key));
    }
    byId("back-to-records").href = "/?" + back + "#record-" + encodeURIComponent(selected);
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

  const labels = new Map([
    ["writing", "文章与随笔"], ["project", "小玩意"],
    ["activity", "活动"], ["daily", "日常小事"],
  ]);
  const getKind = (post) => labels.has(post.kind) ? post.kind : "writing";
  const monthIds = [...new Set(posts.map((post) => post.date.slice(0, 7)))].slice(0, 12).reverse();
  let month = monthIds.includes(query.get("month")) ? query.get("month") : "";
  let kind = labels.has(query.get("kind")) ? query.get("kind") : "";

  function updateFilters() {
    const filters = new URLSearchParams();
    if (month) filters.set("month", month);
    if (kind) filters.set("kind", kind);
    history.replaceState(null, "", "/" + (filters.size ? "?" + filters : "") + "#posts");
    showEntries();
  }

  function showEntries() {
    const list = byId("post-list");
    list.replaceChildren();
    const entries = posts.filter((post) =>
      (!kind || getKind(post) === kind) && (!month || post.date.startsWith(month)));
    byId("post-status").textContent = [month?.replace("-", "."), labels.get(kind), entries.length + " 条记录"].filter(Boolean).join(" · ");
    byId("clear-filters").hidden = !(month || kind);
    for (const [id, value] of [["months", month], ["kinds", kind]]) {
      for (const button of byId(id).children) button.setAttribute("aria-pressed", String(button.value === value));
    }
    for (const post of entries) {
      const item = document.createElement("li");
      const link = document.createElement("a");
      const time = document.createElement("time");
      const category = document.createElement("span");
      item.id = "record-" + post.slug;
      const detail = new URLSearchParams({ post: post.slug });
      if (month) detail.set("month", month);
      if (kind) detail.set("kind", kind);
      link.href = "/?" + detail;
      link.textContent = post.title;
      time.dateTime = post.date;
      time.textContent = post.date.replaceAll("-", ".");
      category.textContent = labels.get(getKind(post));
      item.append(time, link, category);
      list.append(item);
    }
  }

  function addFilters(id, options, select) {
    const nav = byId(id);
    nav.hidden = options.length === 0;
    for (const [value, label] of [["", "全部"], ...options]) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = label;
      button.value = value;
      button.setAttribute("aria-pressed", String(!value));
      button.addEventListener("click", () => {
        select(value);
        updateFilters();
      });
      nav.append(button);
    }
  }

  addFilters("months", monthIds.map((id) => [id, id.replace("-", ".") + " · " + posts.filter((post) => post.date.startsWith(id)).length + " 条"]), (value) => { month = value; });
  addFilters("kinds", posts.length ? [...labels] : [], (value) => { kind = value; });
  byId("clear-filters").addEventListener("click", () => {
    month = kind = "";
    updateFilters();
    byId("kinds").querySelector("button")?.focus();
  });
  showEntries();
  if (location.hash) {
    const target = byId(decodeURIComponent(location.hash.slice(1)));
    (target ?? byId("posts")).scrollIntoView();
  }
}

render().catch(() => byId("post-status").textContent = "内容加载失败，请刷新页面重试。");
