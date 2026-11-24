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
  document.querySelector(".brand").textContent = "Jessica";
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
  byId("links-empty").hidden = Boolean(contacts.children.length || !byId("wechat").hidden);
  const path = location.pathname.replace(/\/$/, "") || "/";
  const routes = {
    "/about": ["about", "简介"], "/code": ["archive", "代码"],
    "/notes": ["archive", "随笔"], "/gallery": ["gallery", "画廊与作品集"],
    "/links": ["links", "链接"],
  };
  const route = routes[path];
  if (route) {
    document.querySelectorAll("main > section").forEach((section) => section.hidden = section.id !== route[0]);
    if (route[0] === "archive") byId("posts").querySelector("h2").textContent = route[1];
    document.title = route[1] + " · Jessica";
    document.querySelector('header a[href="' + path + '/"]')?.setAttribute("aria-current", "page");
  }
  for (const work of site.gallery ?? []) {
    if (!work.image?.startsWith("/uploads/")) continue;
    const figure = document.createElement("figure");
    const image = document.createElement("img");
    const caption = document.createElement("figcaption");
    image.src = work.image;
    image.alt = work.title;
    image.loading = "lazy";
    caption.textContent = work.title;
    const button = document.createElement("button");
    button.type = "button";
    button.setAttribute("aria-label", "查看大图：" + work.title);
    button.append(image);
    button.addEventListener("click", () => {
      const viewer = byId("work-dialog");
      const preview = viewer.querySelector("img");
      preview.src = image.src;
      preview.alt = image.alt;
      viewer.showModal();
    });
    figure.append(button, caption);
    byId("gallery-items").append(figure);
  }
  byId("gallery-empty").hidden = Boolean(byId("gallery-items").children.length);
  initializeSearch(posts);
  const query = new URLSearchParams(location.search);
  const selected = query.get("post");
  if (selected !== null) {
    const back = new URLSearchParams();
    for (const key of ["month", "kind"]) {
      if (query.has(key)) back.set(key, query.get(key));
    }
    byId("back-to-records").href = (query.get("from") === "code" ? "/code/" : query.get("from") === "notes" ? "/notes/" : "/") + "?" + back + "#record-" + encodeURIComponent(selected);
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
    ["writing", "随笔"], ["project", "代码"],
    ["activity", "活动"], ["daily", "日常小事"],
  ]);
  const getKind = (post) => labels.has(post.kind) ? post.kind : "writing";
  const monthIds = [...new Set(posts.map((post) => post.date.slice(0, 7)))].slice(0, 12).reverse();
  let month = monthIds.includes(query.get("month")) ? query.get("month") : "";
  const fixedKind = path === "/code" ? "project" : path === "/notes" ? "writing" : "";
  let kind = fixedKind || (labels.has(query.get("kind")) ? query.get("kind") : "");

  function updateFilters() {
    const filters = new URLSearchParams();
    if (month) filters.set("month", month);
    if (kind) filters.set("kind", kind);
    history.replaceState(null, "", (route ? path + "/" : "/") + (filters.size ? "?" + filters : "") + "#posts");
    showEntries();
  }

  function showEntries() {
    const list = byId("post-list");
    list.replaceChildren();
    const entries = posts.filter((post) =>
      (!kind || getKind(post) === kind) && (!month || post.date.startsWith(month)));
    byId("post-status").textContent = [month?.replace("-", "."), labels.get(kind), entries.length + " 条记录"].filter(Boolean).join(" · ");
    byId("clear-filters").hidden = !(month || (kind && !fixedKind));
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
      if (fixedKind) detail.set("from", path.slice(1));
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
  addFilters("kinds", posts.length && !fixedKind ? [...labels] : [], (value) => { kind = value; });
  byId("clear-filters").addEventListener("click", () => {
    month = "";
    kind = fixedKind;
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

function initializeSearch(posts) {
  const dialog = byId("search-dialog");
  const input = byId("search-input");
  function search() {
    const term = input.value.trim().toLowerCase();
    const results = byId("search-results");
    results.replaceChildren();
    const matches = term ? posts.filter((post) =>
      [post.title, post.body].some((text) => String(text ?? "").toLowerCase().includes(term))) : [];
    byId("search-status").textContent = term ? matches.length + " 条结果" : "可搜索已发布的记录。";
    for (const post of matches.slice(0, 30)) {
      const item = document.createElement("li");
      const link = document.createElement("a");
      link.href = "/?" + new URLSearchParams({ post: post.slug });
      link.textContent = post.title;
      item.append(link);
      results.append(item);
    }
  }
  const open = () => {
    if (!dialog.open) dialog.showModal();
    input.focus();
    search();
  };
  byId("search-open").addEventListener("click", open);
  input.addEventListener("input", search);
  document.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      open();
    }
  });
}

const themeButton = byId("theme-toggle");
const themeModes = ["system", "light", "dark"];
const themeNames = ["跟随系统", "浅色", "深色"];
let theme = localStorage.getItem("jessica-theme");
function applyTheme() {
  if (!themeModes.includes(theme)) theme = "system";
  document.documentElement.dataset.theme = theme;
  const label = "显示模式：" + themeNames[themeModes.indexOf(theme)] + "，点击切换";
  themeButton.title = label;
  themeButton.setAttribute("aria-label", label);
  themeButton.textContent = {system: "◐", light: "☼", dark: "☾"}[theme];
}
applyTheme();
themeButton.addEventListener("click", () => {
  theme = themeModes[(themeModes.indexOf(theme) + 1) % themeModes.length];
  localStorage.setItem("jessica-theme", theme);
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced || !document.startViewTransition) {
    applyTheme();
    return;
  }
  const rect = themeButton.getBoundingClientRect();
  const x = rect.left + rect.width / 2;
  const y = rect.top + rect.height / 2;
  const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
  themeButton.disabled = true;
  const transition = document.startViewTransition(applyTheme);
  transition.ready.then(() => {
    document.documentElement.animate(
      { clipPath: ["circle(0 at " + x + "px " + y + "px)", "circle(" + radius + "px at " + x + "px " + y + "px)"] },
      { duration: 620, easing: "cubic-bezier(.2,.8,.2,1)", pseudoElement: "::view-transition-new(root)" },
    );
  }).catch(() => {});
  transition.finished.finally(() => { themeButton.disabled = false; }).catch(() => {});
});
