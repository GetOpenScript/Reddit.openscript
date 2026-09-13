// ==UserScript==
// @name         Reddit Comments on YouTube
// @version      1.0.0
// @description  View Reddit discussion threads and comments directly above YouTube comments.
// @match        https://www.youtube.com/*
// @run-at       document_idle
// ==/UserScript==

const MOUNT_ID = 'os-reddit-mount';
const STYLE_ID = 'os-reddit-style';
const COMMENTS_SELECTOR = '#comments';
const DESC_SELECTOR = '#description, #description-inline-expander, ytd-text-inline-expander';

let currentVideoId = null;
let activePostId = null;
let cachedPosts = [];
let abortController = null;

const ensureStyles = () => {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    #${MOUNT_ID} {
      margin-bottom: 24px;
      font-family: Roboto, Arial, sans-serif;
      color: var(--yt-spec-text-primary, #0f0f0f);
    }
    .os-tabs {
      display: flex;
      gap: 8px;
      overflow-x: auto;
      padding: 4px 0 12px;
      border-bottom: 1px solid var(--yt-spec-outline, rgba(0,0,0,0.1));
      scrollbar-width: thin;
    }
    .os-tab {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      border-radius: 16px;
      border: 1px solid var(--yt-spec-outline, rgba(0,0,0,0.1));
      background: var(--yt-spec-badge-chip-background, rgba(0,0,0,0.05));
      color: var(--yt-spec-text-secondary, #606060);
      cursor: pointer;
      font-size: 13px;
      font-weight: 500;
      white-space: nowrap;
      transition: background 0.2s, border-color 0.2s;
    }
    .os-tab:hover {
      background: var(--yt-spec-button-chip-background-hover, rgba(0,0,0,0.1));
    }
    .os-tab.os-active {
      background: #ff4500;
      color: #fff;
      border-color: #ff4500;
    }
    .os-tab .os-badge {
      font-size: 10px;
      padding: 1px 5px;
      background: rgba(255,255,255,0.25);
      border-radius: 8px;
    }
    .os-tab:not(.os-active) .os-badge {
      background: var(--yt-spec-outline, rgba(0,0,0,0.1));
      color: var(--yt-spec-text-primary, #0f0f0f);
    }
    .os-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin: 14px 0 12px;
      gap: 12px;
    }
    .os-post-title {
      font-size: 15px;
      font-weight: 600;
      line-height: 1.4;
      color: var(--yt-spec-text-primary, #0f0f0f);
      text-decoration: none;
    }
    .os-post-title:hover {
      text-decoration: underline;
    }
    .os-post-meta {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 4px;
      font-size: 12px;
      color: var(--yt-spec-text-secondary, #606060);
    }
    .os-official-tag {
      background: #0079d3;
      color: #fff;
      font-size: 10px;
      font-weight: 600;
      padding: 2px 6px;
      border-radius: 4px;
    }
    .os-comment-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .os-comment {
      font-size: 13px;
      line-height: 1.5;
    }
    .os-comment-inner {
      padding: 4px 0;
    }
    .os-comment-tagline {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: var(--yt-spec-text-secondary, #606060);
      margin-bottom: 4px;
    }
    .os-collapse {
      background: none;
      border: none;
      color: var(--yt-spec-text-secondary, #606060);
      cursor: pointer;
      font-family: monospace;
      font-size: 12px;
      padding: 0 4px;
    }
    .os-author {
      font-weight: 600;
      color: var(--yt-spec-text-primary, #0f0f0f);
      text-decoration: none;
    }
    .os-author.os-op {
      color: #0079d3;
    }
    .os-score {
      font-weight: 500;
    }
    .os-body {
      color: var(--yt-spec-text-primary, #0f0f0f);
      word-break: break-word;
      overflow-wrap: anywhere;
    }
    .os-body p { margin: 4px 0; }
    .os-body a { color: var(--yt-spec-brand-link-text, #065fd4); text-decoration: none; }
    .os-body a:hover { text-decoration: underline; }
    .os-body blockquote {
      margin: 4px 0;
      padding-left: 8px;
      border-left: 3px solid var(--yt-spec-outline, rgba(0,0,0,0.2));
      color: var(--yt-spec-text-secondary, #606060);
    }
    .os-body pre, .os-body code {
      background: var(--yt-spec-badge-chip-background, rgba(0,0,0,0.05));
      border-radius: 4px;
      font-size: 12px;
      padding: 2px 4px;
    }
    .os-replies {
      margin-left: 12px;
      padding-left: 12px;
      border-left: 2px solid var(--yt-spec-outline, rgba(0,0,0,0.1));
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-top: 8px;
    }
    .os-collapsed > .os-body,
    .os-collapsed > .os-replies,
    .os-collapsed > .os-load-more {
      display: none !important;
    }
    .os-load-more {
      background: none;
      border: 1px solid var(--yt-spec-outline, rgba(0,0,0,0.1));
      border-radius: 12px;
      padding: 4px 10px;
      color: var(--yt-spec-brand-link-text, #065fd4);
      font-size: 12px;
      cursor: pointer;
      margin-top: 6px;
      align-self: flex-start;
    }
    .os-load-more:hover {
      background: var(--yt-spec-badge-chip-background, rgba(0,0,0,0.05));
    }
    .os-status {
      padding: 12px 0;
      font-size: 13px;
      color: var(--yt-spec-text-secondary, #606060);
      font-style: italic;
    }
  `;
  document.head.append(style);
};

const formatScore = n => {
  if (typeof n !== 'number') return '0';
  if (Math.abs(n) >= 1e4) return `${(n / 1e3).toFixed(1)}k`;
  if (Math.abs(n) >= 1e3) return `${(n / 1e3).toFixed(1)}k`;
  return String(n);
};

const timeAgo = utc => {
  const s = Math.max(0, Math.floor(Date.now() / 1e3 - utc));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo}mo ago`;
  return `${Math.floor(mo / 12)}y ago`;
};

const decodeHtml = str => {
  const txt = document.createElement('textarea');
  txt.innerHTML = str;
  return txt.value;
};

const sanitizeHtml = html => {
  const decoded = decodeHtml(html || '')
    .replace(/href="\/((r|u)\/[^"]+)"/g, 'href="https://www.reddit.com/$1"')
    .replace(/<a\b([^>]*)>/gi, '<a target="_blank" rel="noopener noreferrer" $1>');
  const tpl = document.createElement('template');
  tpl.innerHTML = decoded;
  tpl.content.querySelectorAll('script, style, iframe, form, button').forEach(el => el.remove());
  return tpl.innerHTML;
};

const getOfficialSub = () => {
  const descEl = document.querySelector(DESC_SELECTOR);
  const match = descEl?.textContent?.match(/reddit\.com\/r\/([^ /\n\r?]+)/i);
  return match ? match[1].toLowerCase() : null;
};

const getMount = () => {
  let mount = document.getElementById(MOUNT_ID);
  if (mount) return mount;
  const target = document.querySelector(COMMENTS_SELECTOR);
  if (!target || !target.parentNode) return null;
  mount = document.createElement('div');
  mount.id = MOUNT_ID;
  target.parentNode.insertBefore(mount, target);
  return mount;
};

const renderComments = (children, postAuthor) => {
  const container = document.createElement('div');
  container.className = 'os-comment-list';

  for (const child of children) {
    if (child.kind === 'more') {
      const { count, children: moreIds, id, parent_id } = child.data;
      if (!moreIds?.length) continue;
      const btn = document.createElement('button');
      btn.className = 'os-load-more';
      btn.textContent = `Load more comments (${count || moreIds.length})`;
      btn.onclick = async () => {
        btn.disabled = true;
        btn.textContent = 'Loading...';
        try {
          const res = await OpenScript.fetch(
            `https://www.reddit.com/api/morechildren.json?api_type=json&link_id=${activePostId}&children=${moreIds.slice(0, 20).join(',')}&sort=best`
          );
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const json = await res.json();
          const items = json?.json?.data?.things?.map(t => t.data) || [];
          const rendered = renderFlatComments(items, postAuthor);
          btn.replaceWith(rendered);
        } catch {
          btn.textContent = 'Failed to load comments';
        }
      };
      container.append(btn);
      continue;
    }

    const { id, author, score, created_utc, body_html, replies } = child.data;
    if (!body_html) continue;

    const el = document.createElement('div');
    el.className = 'os-comment';
    el.id = `os-c-${id}`;

    const tagline = document.createElement('div');
    tagline.className = 'os-comment-tagline';

    const toggle = document.createElement('button');
    toggle.className = 'os-collapse';
    toggle.textContent = '[–]';
    toggle.onclick = () => {
      const isCol = el.classList.toggle('os-collapsed');
      toggle.textContent = isCol ? '[+]' : '[–]';
    };

    const authorLink = document.createElement('a');
    authorLink.className = `os-author${author === postAuthor ? ' os-op' : ''}`;
    authorLink.href = `https://www.reddit.com/u/${author}`;
    authorLink.target = '_blank';
    authorLink.rel = 'noopener noreferrer';
    authorLink.textContent = author;

    const metaSpan = document.createElement('span');
    metaSpan.className = 'os-score';
    metaSpan.textContent = `• ${formatScore(score)} points • ${timeAgo(created_utc)}`;

    tagline.append(toggle, authorLink, metaSpan);

    const body = document.createElement('div');
    body.className = 'os-body';
    body.innerHTML = sanitizeHtml(body_html);

    el.append(tagline, body);

    if (replies?.data?.children?.length) {
      const sub = renderComments(replies.data.children, postAuthor);
      sub.className = 'os-replies';
      el.append(sub);
    }

    container.append(el);
  }

  return container;
};

const renderFlatComments = (items, postAuthor) => {
  const wrap = document.createDocumentFragment();
  for (const item of items) {
    if (!item.body_html) continue;
    const el = document.createElement('div');
    el.className = 'os-comment';

    const tagline = document.createElement('div');
    tagline.className = 'os-comment-tagline';

    const authorLink = document.createElement('a');
    authorLink.className = `os-author${item.author === postAuthor ? ' os-op' : ''}`;
    authorLink.href = `https://www.reddit.com/u/${item.author}`;
    authorLink.target = '_blank';
    authorLink.rel = 'noopener noreferrer';
    authorLink.textContent = item.author;

    const meta = document.createElement('span');
    meta.className = 'os-score';
    meta.textContent = `• ${formatScore(item.score)} points • ${timeAgo(item.created_utc)}`;

    tagline.append(authorLink, meta);

    const body = document.createElement('div');
    body.className = 'os-body';
    body.innerHTML = sanitizeHtml(item.body_html);

    el.append(tagline, body);
    wrap.append(el);
  }
  return wrap;
};

const loadPostComments = async (post, postContainer) => {
  postContainer.innerHTML = '<div class="os-status">Loading Reddit comments...</div>';
  try {
    const res = await OpenScript.fetch(`https://www.reddit.com/comments/${post.id}.json?sort=best`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const [, commentsData] = await res.json();
    const children = commentsData?.data?.children || [];

    postContainer.innerHTML = '';
    if (!children.length) {
      postContainer.innerHTML = '<div class="os-status">No comments in this thread yet.</div>';
      return;
    }
    postContainer.append(renderComments(children, post.author));
  } catch (err) {
    postContainer.innerHTML = `<div class="os-status">Unable to load Reddit comments (${err.message}).</div>`;
  }
};

const renderThread = post => {
  const mount = getMount();
  if (!mount) return;

  let contentArea = mount.querySelector('.os-content-area');
  if (!contentArea) {
    contentArea = document.createElement('div');
    contentArea.className = 'os-content-area';
    mount.append(contentArea);
  }
  contentArea.innerHTML = '';

  const header = document.createElement('div');
  header.className = 'os-header';

  const left = document.createElement('div');
  const title = document.createElement('a');
  title.className = 'os-post-title';
  title.href = `https://www.reddit.com${post.permalink}`;
  title.target = '_blank';
  title.rel = 'noopener noreferrer';
  title.textContent = decodeHtml(post.title);

  const meta = document.createElement('div');
  meta.className = 'os-post-meta';
  meta.textContent = `r/${post.subreddit} • Posted by u/${post.author} ${timeAgo(post.created_utc)} • ${formatScore(post.score)} points`;

  left.append(title, meta);
  header.append(left);
  contentArea.append(header);

  const commentsArea = document.createElement('div');
  commentsArea.className = 'os-comments-area';
  contentArea.append(commentsArea);

  loadPostComments(post, commentsArea);
};

const renderTabs = posts => {
  const mount = getMount();
  if (!mount) return;

  const officialSub = getOfficialSub();
  if (officialSub) {
    posts.sort((a, b) => (a.subreddit.toLowerCase() === officialSub ? -1 : b.subreddit.toLowerCase() === officialSub ? 1 : 0));
  }

  let tabs = mount.querySelector('.os-tabs');
  if (!tabs) {
    tabs = document.createElement('div');
    tabs.className = 'os-tabs';
    mount.prepend(tabs);
  }
  tabs.innerHTML = '';

  const activePost = posts.find(p => p.name === activePostId) || posts[0];
  activePostId = activePost.name;

  posts.forEach(post => {
    const isOfficial = officialSub && post.subreddit.toLowerCase() === officialSub;
    const tab = document.createElement('div');
    tab.className = `os-tab${post.name === activePostId ? ' os-active' : ''}`;
    tab.textContent = `r/${post.subreddit}`;

    if (isOfficial) {
      const off = document.createElement('span');
      off.className = 'os-official-tag';
      off.textContent = 'Official';
      tab.append(off);
    }

    const badge = document.createElement('span');
    badge.className = 'os-badge';
    badge.textContent = `${formatScore(post.score)} ↑ • ${post.num_comments} 💬`;
    tab.append(badge);

    tab.onclick = () => {
      if (activePostId === post.name) return;
      activePostId = post.name;
      tabs.querySelectorAll('.os-tab').forEach(t => t.classList.remove('os-active'));
      tab.classList.add('os-active');
      renderThread(post);
    };

    tabs.append(tab);
  });

  renderThread(activePost);
};

const updateForVideo = async videoId => {
  ensureStyles();
  const mount = getMount();
  if (!mount) return;

  mount.innerHTML = '<div class="os-status">Searching Reddit for discussion threads...</div>';
  cachedPosts = [];

  try {
    const res = await OpenScript.fetch(
      `https://www.reddit.com/search.json?q=url:'${encodeURIComponent(videoId)}'&sort=top&type=link`
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const posts = data?.data?.children?.map(c => c.data) || [];

    if (!posts.length) {
      mount.innerHTML = '';
      return;
    }

    cachedPosts = posts;
    renderTabs(posts);
  } catch (err) {
    mount.innerHTML = `<div class="os-status">Could not search Reddit (${err.message}).</div>`;
  }
};

const check = () => {
  const id = new URLSearchParams(location.search).get('v');
  if (!id) {
    currentVideoId = null;
    const mount = document.getElementById(MOUNT_ID);
    if (mount) mount.innerHTML = '';
    return;
  }
  if (id === currentVideoId) {
    if (cachedPosts.length && !document.getElementById(MOUNT_ID)?.hasChildNodes()) {
      renderTabs(cachedPosts);
    }
    return;
  }
  currentVideoId = id;
  activePostId = null;
  updateForVideo(id);
};

document.addEventListener('yt-navigate-finish', check);
setInterval(check, 1200);
check();
