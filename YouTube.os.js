// ==UserScript==
// @name         Reddit Comments on YouTube
// @version      1.0.3
// @description  View Reddit discussion threads and comments in Old Reddit UI directly above YouTube comments.
// @match        https://www.youtube.com/*
// @run-at       document_idle
// ==/UserScript==

const MOUNT_ID = 'os-reddit-mount';
const STYLE_ID = 'os-reddit-style';
const DESC_SELECTOR = '#description, #description-inline-expander, ytd-text-inline-expander';

let currentVideoId = null;
let activePostId = null;
let cachedPosts = [];
let currentSort = 'best';

const ensureStyles = () => {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    #${MOUNT_ID}, #${MOUNT_ID} * {
      box-sizing: border-box;
    }
    #${MOUNT_ID} {
      margin: 16px 0 24px;
      font-family: Verdana, Arial, Helvetica, sans-serif;
      font-size: 12px;
      color: #222;
    }
    html[dark] #${MOUNT_ID} {
      color: #d7dadc;
    }
    .os-tabs {
      display: flex;
      list-style: none;
      margin: 0;
      padding: 0;
      overflow-x: auto;
      overflow-y: hidden;
      scrollbar-width: none;
      -ms-overflow-style: none;
      position: relative;
      z-index: 2;
    }
    .os-tabs::-webkit-scrollbar {
      display: none;
      width: 0;
      height: 0;
    }
    .os-tab {
      background: #f1f1f1;
      border: 1px solid #ddd;
      display: flex;
      flex: 1 1 0;
      font-size: 12px;
      justify-content: center;
      align-items: center;
      padding: 6px 12px;
      cursor: pointer;
      color: #333;
      user-select: none;
      text-decoration: none;
    }
    .os-tab:not(:first-child) {
      border-left: none;
    }
    html[dark] .os-tab {
      background: #202020;
      border-color: #383838;
      color: #aaa;
    }
    .os-tab:hover {
      background: #fff;
    }
    html[dark] .os-tab:hover {
      background: #181818;
      color: #eee;
    }
    .os-tab.os-active {
      background: #fff;
      color: #000;
      font-weight: bold;
      border-bottom-color: #fff;
    }
    html[dark] .os-tab.os-active {
      background: #0f0f0f;
      color: #fff;
      border-bottom-color: #0f0f0f;
    }
    .os-tab .os-count {
      color: #888;
      font-weight: normal;
      margin-left: 4px;
    }
    .os-tab.os-official {
      color: #ff4500;
    }
    .os-box {
      border: 1px solid #ddd;
      border-top: none;
      padding: 12px 14px 16px;
      background: #fff;
    }
    html[dark] .os-box {
      border-color: #383838;
      background: #0f0f0f;
    }
    .os-post-entry {
      display: flex;
      align-items: flex-start;
      margin-bottom: 12px;
    }
    .os-post-score {
      font-size: 15px;
      font-weight: bold;
      color: #555;
      min-width: 32px;
      padding-top: 1px;
      text-align: center;
      margin-right: 8px;
    }
    html[dark] .os-post-score {
      color: #aaa;
    }
    .os-post-main {
      flex: 1;
    }
    .os-post-title {
      font-size: 15px;
      color: #0000ff;
      text-decoration: none;
      line-height: 1.35;
      font-weight: normal;
    }
    html[dark] .os-post-title {
      color: #4f9feb;
    }
    .os-post-title:hover {
      text-decoration: underline;
    }
    .os-post-tagline {
      font-size: 10px;
      color: #888;
      margin: 4px 0;
    }
    .os-post-tagline a {
      color: #369;
      text-decoration: none;
    }
    html[dark] .os-post-tagline a {
      color: #2693e6;
    }
    .os-post-tagline a:hover {
      text-decoration: underline;
    }
    .os-actions {
      display: flex;
      gap: 8px;
      font-size: 10px;
      font-weight: bold;
      color: #888;
      list-style: none;
      margin: 0;
      padding: 0;
    }
    .os-actions a {
      color: #888;
      text-decoration: none;
    }
    .os-actions a:hover {
      text-decoration: underline;
    }
    .os-sort-bar {
      font-size: 11px;
      color: #333;
      margin: 10px 0 12px 40px;
    }
    html[dark] .os-sort-bar {
      color: #aaa;
    }
    .os-sort-bar select {
      font-size: 11px;
      margin-left: 4px;
      background: inherit;
      color: inherit;
      border: 1px solid #ccc;
      border-radius: 2px;
      padding: 1px 3px;
    }
    html[dark] .os-sort-bar select {
      border-color: #555;
      background: #222;
    }
    .os-comment-tree {
      margin-left: 10px;
    }
    .os-comment {
      margin-top: 10px;
    }
    .os-tagline {
      font-size: 10px;
      color: #888;
      display: flex;
      align-items: center;
      gap: 4px;
      flex-wrap: wrap;
      margin-bottom: 4px;
    }
    .os-collapse {
      color: #369;
      background: none;
      border: none;
      cursor: pointer;
      font-family: monospace;
      font-size: 11px;
      padding: 0 2px;
      font-weight: bold;
    }
    html[dark] .os-collapse {
      color: #2693e6;
    }
    .os-author {
      font-weight: bold;
      color: #369;
      text-decoration: none;
    }
    html[dark] .os-author {
      color: #2693e6;
    }
    .os-author:hover {
      text-decoration: underline;
    }
    .os-author.os-op {
      color: #0055df;
    }
    .os-op-tag {
      color: #0055df;
      font-weight: bold;
      font-size: 10px;
      margin-left: 2px;
    }
    html[dark] .os-op-tag, html[dark] .os-author.os-op {
      color: #5296dd;
    }
    .os-flair {
      background: #f5f5f5;
      border: 1px solid #ddd;
      border-radius: 2px;
      color: #555;
      font-size: 9px;
      padding: 0 3px;
    }
    html[dark] .os-flair {
      background: #282828;
      border-color: #4a4a4a;
      color: #ccc;
    }
    .os-score {
      font-weight: bold;
      color: #888;
    }
    .os-time {
      color: #aaa;
    }
    .os-body {
      color: #222;
      font-size: 13px;
      line-height: 1.45;
      margin-left: 18px;
      word-break: break-word;
      overflow-wrap: anywhere;
    }
    html[dark] .os-body {
      color: #d7dadc;
    }
    .os-body p { margin: 4px 0; }
    .os-body a { color: #0079d3; text-decoration: none; }
    html[dark] .os-body a { color: #4f9feb; }
    .os-body a:hover { text-decoration: underline; }
    .os-body blockquote {
      border-left: 2px solid #c5c1ad;
      margin: 4px 0 4px 4px;
      padding-left: 8px;
      color: #555;
    }
    html[dark] .os-body blockquote {
      border-left-color: #666;
      color: #999;
    }
    .os-body pre, .os-body code {
      background: #f8f8f8;
      border: 1px solid #e5e5e5;
      border-radius: 2px;
      font-size: 11px;
      padding: 1px 3px;
    }
    html[dark] .os-body pre, html[dark] .os-body code {
      background: #1c1c1c;
      border-color: #333;
    }
    .os-comment-actions {
      margin: 2px 0 6px 18px;
      display: flex;
      gap: 8px;
      font-size: 10px;
      font-weight: bold;
      color: #888;
    }
    .os-comment-actions a {
      color: #888;
      text-decoration: none;
    }
    .os-comment-actions a:hover {
      text-decoration: underline;
    }
    .os-children {
      border-left: 1px dotted #ddf;
      margin-left: 14px;
      padding-left: 6px;
    }
    html[dark] .os-children {
      border-left-color: #3a3a3a;
    }
    .os-collapsed > .os-body,
    .os-collapsed > .os-comment-actions,
    .os-collapsed > .os-children {
      display: none !important;
    }
    .os-collapsed .os-tagline {
      font-style: italic;
    }
    .os-load-more {
      background: none;
      border: none;
      color: #369;
      font-weight: bold;
      font-size: 11px;
      cursor: pointer;
      margin: 8px 0 8px 18px;
      padding: 0;
      display: block;
    }
    html[dark] .os-load-more {
      color: #2693e6;
    }
    .os-load-more:hover {
      text-decoration: underline;
    }
    .os-status {
      padding: 10px;
      color: #888;
      font-style: italic;
    }
  `;
  document.head.append(style);
};

const formatScore = n => (typeof n === 'number' ? n.toLocaleString() : '0');

const timeAgo = utc => {
  const s = Math.max(0, Math.floor(Date.now() / 1e3 - utc));
  if (s < 60) return `${s} seconds ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} minute${m === 1 ? '' : 's'} ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? '' : 's'} ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} day${d === 1 ? '' : 's'} ago`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo} month${mo === 1 ? '' : 's'} ago`;
  const y = Math.floor(mo / 12);
  return `${y} year${y === 1 ? '' : 's'} ago`;
};

const decodeHtml = str => {
  const txt = document.createElement('textarea');
  txt.innerHTML = str || '';
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
  if (mount && mount.isConnected) return mount;

  const comments = document.querySelector('#comments, ytd-comments');
  if (comments && comments.parentNode) {
    mount = document.createElement('div');
    mount.id = MOUNT_ID;
    comments.parentNode.insertBefore(mount, comments);
    return mount;
  }

  const meta = document.querySelector('#below > ytd-watch-metadata, #below > #watch-metadata');
  if (meta && meta.parentNode) {
    mount = document.createElement('div');
    mount.id = MOUNT_ID;
    meta.parentNode.insertBefore(mount, meta.nextSibling);
    return mount;
  }

  const below = document.querySelector('#below');
  if (below) {
    mount = document.createElement('div');
    mount.id = MOUNT_ID;
    below.append(mount);
    return mount;
  }

  return null;
};

const waitForMount = async (maxAttempts = 40) => {
  for (let i = 0; i < maxAttempts; i++) {
    const m = getMount();
    if (m) return m;
    await new Promise(r => setTimeout(r, 250));
  }
  return null;
};

const renderComments = (children, postAuthor, permalink) => {
  const container = document.createElement('div');
  container.className = 'os-comment-tree';

  for (const child of children) {
    if (child.kind === 'more') {
      const { count, children: moreIds } = child.data;
      if (!moreIds?.length) continue;
      const btn = document.createElement('button');
      btn.className = 'os-load-more';
      btn.textContent = `load more comments (${count || moreIds.length})`;
      btn.onclick = async () => {
        btn.disabled = true;
        btn.textContent = 'loading...';
        try {
          const res = await OpenScript.fetch(
            `https://www.reddit.com/api/morechildren.json?api_type=json&link_id=${activePostId}&children=${moreIds.slice(0, 20).join(',')}&sort=${currentSort}`
          );
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const json = await res.json();
          const items = json?.json?.data?.things?.map(t => t.data) || [];
          btn.replaceWith(renderFlatComments(items, postAuthor, permalink));
        } catch {
          btn.textContent = 'failed to load comments';
        }
      };
      container.append(btn);
      continue;
    }

    const { id, author, score, created_utc, body_html, replies, author_flair_text } = child.data;
    if (!body_html) continue;

    const isDeleted = author === '[deleted]';
    const isOp = author === postAuthor;

    const el = document.createElement('div');
    el.className = 'os-comment';
    el.id = `os-c-${id}`;

    const tagline = document.createElement('div');
    tagline.className = 'os-tagline';

    const toggle = document.createElement('button');
    toggle.className = 'os-collapse';
    toggle.textContent = '[-]';
    toggle.onclick = () => {
      const isCol = el.classList.toggle('os-collapsed');
      toggle.textContent = isCol ? '[+]' : '[-]';
    };

    tagline.append(toggle);

    if (isDeleted) {
      const del = document.createElement('span');
      del.className = 'os-author';
      del.textContent = '[deleted]';
      tagline.append(del);
    } else {
      const authorLink = document.createElement('a');
      authorLink.className = `os-author${isOp ? ' os-op' : ''}`;
      authorLink.href = `https://www.reddit.com/u/${author}`;
      authorLink.target = '_blank';
      authorLink.rel = 'noopener noreferrer';
      authorLink.textContent = author;
      tagline.append(authorLink);

      if (isOp) {
        const opTag = document.createElement('span');
        opTag.className = 'os-op-tag';
        opTag.textContent = '[S]';
        tagline.append(opTag);
      }
    }

    if (author_flair_text) {
      const flair = document.createElement('span');
      flair.className = 'os-flair';
      flair.textContent = decodeHtml(author_flair_text);
      tagline.append(flair);
    }

    const meta = document.createElement('span');
    meta.className = 'os-score';
    const ptText = Math.abs(score) === 1 ? 'point' : 'points';
    meta.textContent = `${score} ${ptText}`;

    const time = document.createElement('span');
    time.className = 'os-time';
    time.textContent = timeAgo(created_utc);

    tagline.append(meta, time);

    const body = document.createElement('div');
    body.className = 'os-body';
    body.innerHTML = sanitizeHtml(body_html);

    const actions = document.createElement('div');
    actions.className = 'os-comment-actions';
    const permLink = document.createElement('a');
    permLink.href = `https://www.reddit.com${permalink}${id}`;
    permLink.target = '_blank';
    permLink.rel = 'noopener noreferrer';
    permLink.textContent = 'permalink';
    actions.append(permLink);

    el.append(tagline, body, actions);

    if (replies?.data?.children?.length) {
      const sub = renderComments(replies.data.children, postAuthor, permalink);
      sub.className = 'os-children';
      el.append(sub);
    }

    container.append(el);
  }

  return container;
};

const renderFlatComments = (items, postAuthor, permalink) => {
  const wrap = document.createDocumentFragment();
  for (const item of items) {
    if (!item.body_html) continue;
    const isOp = item.author === postAuthor;
    const isDeleted = item.author === '[deleted]';

    const el = document.createElement('div');
    el.className = 'os-comment';

    const tagline = document.createElement('div');
    tagline.className = 'os-tagline';

    const toggle = document.createElement('button');
    toggle.className = 'os-collapse';
    toggle.textContent = '[-]';
    toggle.onclick = () => {
      const isCol = el.classList.toggle('os-collapsed');
      toggle.textContent = isCol ? '[+]' : '[-]';
    };
    tagline.append(toggle);

    if (isDeleted) {
      const del = document.createElement('span');
      del.className = 'os-author';
      del.textContent = '[deleted]';
      tagline.append(del);
    } else {
      const authorLink = document.createElement('a');
      authorLink.className = `os-author${isOp ? ' os-op' : ''}`;
      authorLink.href = `https://www.reddit.com/u/${item.author}`;
      authorLink.target = '_blank';
      authorLink.rel = 'noopener noreferrer';
      authorLink.textContent = item.author;
      tagline.append(authorLink);

      if (isOp) {
        const opTag = document.createElement('span');
        opTag.className = 'os-op-tag';
        opTag.textContent = '[S]';
        tagline.append(opTag);
      }
    }

    const meta = document.createElement('span');
    meta.className = 'os-score';
    const ptText = Math.abs(item.score) === 1 ? 'point' : 'points';
    meta.textContent = `${item.score} ${ptText}`;

    const time = document.createElement('span');
    time.className = 'os-time';
    time.textContent = timeAgo(item.created_utc);

    tagline.append(meta, time);

    const body = document.createElement('div');
    body.className = 'os-body';
    body.innerHTML = sanitizeHtml(item.body_html);

    const actions = document.createElement('div');
    actions.className = 'os-comment-actions';
    const permLink = document.createElement('a');
    permLink.href = `https://www.reddit.com${permalink}${item.id}`;
    permLink.target = '_blank';
    permLink.rel = 'noopener noreferrer';
    permLink.textContent = 'permalink';
    actions.append(permLink);

    el.append(tagline, body, actions);
    wrap.append(el);
  }
  return wrap;
};

const loadPostComments = async (post, container) => {
  container.innerHTML = '<div class="os-status">loading comments...</div>';
  try {
    const res = await OpenScript.fetch(`https://www.reddit.com/comments/${post.id}.json?sort=${currentSort}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const [, commentsData] = await res.json();
    const children = commentsData?.data?.children || [];

    container.innerHTML = '';
    if (!children.length) {
      container.innerHTML = '<div class="os-status">no comments (yet)</div>';
      return;
    }
    container.append(renderComments(children, post.author, post.permalink));
  } catch (err) {
    container.innerHTML = `<div class="os-status">unable to load comments (${err.message}).</div>`;
  }
};

const renderThread = (post, box) => {
  box.innerHTML = '';

  const entry = document.createElement('div');
  entry.className = 'os-post-entry';

  const scoreDiv = document.createElement('div');
  scoreDiv.className = 'os-post-score';
  scoreDiv.textContent = post.score;

  const mainDiv = document.createElement('div');
  mainDiv.className = 'os-post-main';

  const title = document.createElement('a');
  title.className = 'os-post-title';
  title.href = `https://www.reddit.com${post.permalink}`;
  title.target = '_blank';
  title.rel = 'noopener noreferrer';
  title.textContent = decodeHtml(post.title);

  const tagline = document.createElement('div');
  tagline.className = 'os-post-tagline';
  tagline.innerHTML = `
    submitted ${timeAgo(post.created_utc)} by
    <a href="https://www.reddit.com/u/${post.author}" target="_blank" rel="noopener noreferrer">${post.author}</a>
    to <a href="https://www.reddit.com/r/${post.subreddit}" target="_blank" rel="noopener noreferrer">r/${post.subreddit}</a>
  `;

  const actions = document.createElement('ul');
  actions.className = 'os-actions';
  const permLi = document.createElement('li');
  const permA = document.createElement('a');
  permA.href = `https://www.reddit.com${post.permalink}`;
  permA.target = '_blank';
  permA.rel = 'noopener noreferrer';
  permA.textContent = `${post.num_comments} comments`;
  permLi.append(permA);
  actions.append(permLi);

  mainDiv.append(title, tagline, actions);
  entry.append(scoreDiv, mainDiv);
  box.append(entry);

  const sortBar = document.createElement('div');
  sortBar.className = 'os-sort-bar';
  sortBar.innerHTML = `
    sorted by:
    <select>
      <option value="best">best</option>
      <option value="top">top</option>
      <option value="new">new</option>
      <option value="controversial">controversial</option>
      <option value="old">old</option>
      <option value="qa">q&a</option>
    </select>
  `;
  const select = sortBar.querySelector('select');
  select.value = currentSort;
  select.onchange = e => {
    currentSort = e.target.value;
    loadPostComments(post, commentsContainer);
  };
  box.append(sortBar);

  const commentsContainer = document.createElement('div');
  box.append(commentsContainer);

  loadPostComments(post, commentsContainer);
};

const renderTabs = (posts, mount) => {
  mount.innerHTML = '';
  const officialSub = getOfficialSub();
  if (officialSub) {
    posts.sort((a, b) => (a.subreddit.toLowerCase() === officialSub ? -1 : b.subreddit.toLowerCase() === officialSub ? 1 : 0));
  }

  const tabs = document.createElement('div');
  tabs.className = 'os-tabs';
  mount.append(tabs);

  const box = document.createElement('div');
  box.className = 'os-box';
  mount.append(box);

  const activePost = posts.find(p => p.name === activePostId) || posts[0];
  activePostId = activePost.name;

  posts.forEach(post => {
    const isOfficial = officialSub && post.subreddit.toLowerCase() === officialSub;
    const tab = document.createElement('div');
    tab.className = `os-tab${post.name === activePostId ? ' os-active' : ''}${isOfficial ? ' os-official' : ''}`;
    tab.innerHTML = `${post.subreddit} <span class="os-count">(${post.num_comments})</span>`;

    tab.onclick = () => {
      if (activePostId === post.name) return;
      activePostId = post.name;
      tabs.querySelectorAll('.os-tab').forEach(t => t.classList.remove('os-active'));
      tab.classList.add('os-active');
      renderThread(post, box);
    };

    tabs.append(tab);
  });

  renderThread(activePost, box);
};

const updateForVideo = async videoId => {
  ensureStyles();
  cachedPosts = [];
  activePostId = null;

  const initialMount = getMount();
  if (initialMount) {
    initialMount.innerHTML = '<div class="os-box"><div class="os-status">searching reddit...</div></div>';
  }

  try {
    const res = await OpenScript.fetch(
      `https://www.reddit.com/search.json?q=url:'${encodeURIComponent(videoId)}'&sort=top&type=link`
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const posts = data?.data?.children?.map(c => c.data) || [];

    if (videoId !== currentVideoId) return;

    const mount = await waitForMount();
    if (!mount || videoId !== currentVideoId) return;

    if (!posts.length) {
      mount.innerHTML = '';
      return;
    }

    cachedPosts = posts;
    renderTabs(posts, mount);
  } catch (err) {
    const mount = await waitForMount();
    if (mount && videoId === currentVideoId) {
      mount.innerHTML = `<div class="os-box"><div class="os-status">could not search reddit (${err.message})</div></div>`;
    }
  }
};

const getVideoId = () => {
  const search = new URLSearchParams(location.search);
  if (search.get('v')) return search.get('v');
  const match = location.pathname.match(/\/shorts\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
};

const check = () => {
  const id = getVideoId();
  if (!id) {
    currentVideoId = null;
    const mount = document.getElementById(MOUNT_ID);
    if (mount) mount.innerHTML = '';
    return;
  }
  if (id === currentVideoId) {
    if (cachedPosts.length && !document.getElementById(MOUNT_ID)?.hasChildNodes()) {
      const mount = getMount();
      if (mount) renderTabs(cachedPosts, mount);
    }
    return;
  }
  currentVideoId = id;
  updateForVideo(id);
};

document.addEventListener('yt-navigate-finish', check);
setInterval(check, 1000);
check();
