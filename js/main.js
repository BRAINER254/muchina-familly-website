var VIDEO_BUCKET = 'family-videos';
var VIDEO_MAX_BYTES = 50 * 1024 * 1024;
var VIDEO_TYPES = {
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov'
};

function getSupabaseClient() {
  var config = window.SUPABASE_CONFIG;
  if (!config || !config.url || !config.anonKey) {
    throw new Error('Supabase is not configured. Add the Project URL and public anon/publishable key to js/supabase-config.js.');
  }
  if (!window.supabase || !window.supabase.createClient) {
    throw new Error('The Supabase client could not be loaded. Check your internet connection and reload the page.');
  }
  return window.supabase.createClient(config.url, config.anonKey);
}

function setStatus(element, message, isError) {
  element.textContent = message;
  element.classList.toggle('error', Boolean(isError));
}

function appendPost(container, post, client) {
  var article = document.createElement('article');
  article.className = 'item';
  var heading = document.createElement('h4');
  heading.textContent = post.title;
  article.appendChild(heading);
  if (post.kind === 'video' && post.video_path) {
    var video = document.createElement('video');
    video.controls = true;
    video.preload = 'metadata';
    video.src = client.storage.from(VIDEO_BUCKET).getPublicUrl(post.video_path).data.publicUrl;
    video.setAttribute('aria-label', post.title);
    article.appendChild(video);
  } else if (post.body) {
    var body = document.createElement('p');
    body.textContent = post.body;
    article.appendChild(body);
  }
  var metadata = document.createElement('p');
  metadata.className = 'post-meta';
  var time = document.createElement('time');
  time.dateTime = post.created_at;
  time.textContent = new Date(post.created_at).toLocaleString();
  metadata.appendChild(time);
  if (post.author_name) {
    metadata.appendChild(document.createTextNode(' · ' + post.author_name));
  }
  article.appendChild(metadata);
  container.appendChild(article);
}

async function loadPosts(client, container, kind) {
  try {
    var query = client.from('content_posts').select('id, kind, title, body, author_name, video_path, created_at')
      .eq('kind', kind).order('created_at', { ascending: false });
    if (container.dataset.limit) query = query.limit(Number(container.dataset.limit));
    var result = await query;
    if (result.error) throw result.error;
    container.replaceChildren();
    if (result.data.length === 0) {
      var empty = document.createElement('p');
      empty.textContent = kind === 'announcement' ? 'No announcements yet.' : 'No ideas yet.';
      container.appendChild(empty);
      return;
    }
    result.data.forEach(function(post) { appendPost(container, post, client); });
  } catch (error) {
    container.textContent = 'Could not load content: ' + error.message;
    container.classList.add('error');
  }
}

async function loadVideos(client, container) {
  try {
    var result = await client.from('content_posts')
      .select('id, kind, title, body, author_name, video_path, created_at')
      .eq('kind', 'video').order('created_at', { ascending: false });
    if (result.error) throw result.error;
    container.replaceChildren();
    if (result.data.length === 0) {
      container.textContent = 'No videos have been posted yet.';
      return;
    }
    result.data.forEach(function(post) { appendPost(container, post, client); });
  } catch (error) {
    container.textContent = 'Could not load videos: ' + error.message;
    container.classList.add('error');
  }
}

function readFormValues(form) {
  return {
    title: form.elements.title.value.trim(),
    author_name: form.elements.author_name.value.trim() || null,
    body: form.elements.body.value.trim()
  };
}

function wirePostForm(client, form) {
  form.addEventListener('submit', async function(event) {
    event.preventDefault();
    var status = form.querySelector('.form-status');
    var button = form.querySelector('button[type="submit"]');
    var values = readFormValues(form);
    if (!values.title || !values.body) {
      setStatus(status, 'Please enter a title and details.', true);
      return;
    }
    button.disabled = true;
    setStatus(status, 'Publishing…', false);
    try {
      var result = await client.from('content_posts').insert({
        kind: form.dataset.kind,
        title: values.title,
        author_name: values.author_name,
        body: values.body
      });
      if (result.error) throw result.error;
      form.reset();
      setStatus(status, 'Published successfully.', false);
      var list = document.querySelector('[data-post-list="' + form.dataset.kind + '"]');
      if (list) await loadPosts(client, list, form.dataset.kind);
    } catch (error) {
      setStatus(status, 'Could not publish: ' + error.message, true);
    } finally {
      button.disabled = false;
    }
  });
}

function wireVideoForm(client, form) {
  form.addEventListener('submit', async function(event) {
    event.preventDefault();
    var status = form.querySelector('.form-status');
    var button = form.querySelector('button[type="submit"]');
    var title = form.elements.title.value.trim();
    var authorName = form.elements.author_name.value.trim() || null;
    var file = form.elements.video.files[0];
    if (!title || !file) {
      setStatus(status, 'Enter a video title and choose a file.', true);
      return;
    }
    if (!Object.prototype.hasOwnProperty.call(VIDEO_TYPES, file.type)) {
      setStatus(status, 'Choose an MP4, WebM, or MOV video file.', true);
      return;
    }
    if (file.size === 0 || file.size > VIDEO_MAX_BYTES) {
      setStatus(status, 'The video must be larger than 0 bytes and no larger than 50 MB.', true);
      return;
    }
    button.disabled = true;
    setStatus(status, 'Uploading video…', false);
    try {
      var path = 'videos/' + crypto.randomUUID() + '.' + VIDEO_TYPES[file.type];
      var upload = await client.storage.from(VIDEO_BUCKET).upload(path, file, {
        contentType: file.type,
        upsert: false
      });
      if (upload.error) throw upload.error;
      var result = await client.from('content_posts').insert({
        kind: 'video',
        title: title,
        author_name: authorName,
        body: '',
        video_path: path
      });
      if (result.error) {
        throw new Error('The video uploaded but its post could not be saved: ' + result.error.message + ' Contact the site administrator to remove the unused upload.');
      }
      form.reset();
      setStatus(status, 'Video uploaded and published successfully.', false);
      var list = document.querySelector('[data-video-list]');
      if (list) await loadVideos(client, list);
    } catch (error) {
      setStatus(status, 'Could not publish video: ' + error.message, true);
    } finally {
      button.disabled = false;
    }
  });
}

document.addEventListener('DOMContentLoaded', function() {
  var navToggle = document.getElementById('navToggle');
  var mainNav = document.getElementById('mainNav');
  if (navToggle && mainNav) {
    navToggle.addEventListener('click', function() {
      var expanded = navToggle.getAttribute('aria-expanded') === 'true';
      navToggle.setAttribute('aria-expanded', String(!expanded));
      mainNav.style.display = expanded ? 'none' : 'flex';
      mainNav.style.flexDirection = 'column';
    });
  }

  var galleryImgs = document.querySelectorAll('.gallery img');
  var lightbox = document.getElementById('lightbox');
  var lightboxImage = document.getElementById('lbImg');
  var closeLightbox = document.getElementById('closeLb');
  if (galleryImgs.length && lightbox && lightboxImage) {
    galleryImgs.forEach(function(image) {
      image.addEventListener('click', function() {
        lightboxImage.src = image.dataset.full || image.src;
        lightboxImage.alt = image.alt;
        lightbox.hidden = false;
      });
    });
    if (closeLightbox) {
      closeLightbox.addEventListener('click', function() {
        lightbox.hidden = true;
        lightboxImage.src = '';
      });
    }
    lightbox.addEventListener('click', function(event) {
      if (event.target === lightbox) {
        lightbox.hidden = true;
        lightboxImage.src = '';
      }
    });
  }

  var lists = Array.from(document.querySelectorAll('[data-post-list], [data-video-list]'));
  var forms = Array.from(document.querySelectorAll('[data-post-form], [data-video-form]'));
  if (!lists.length && !forms.length) return;
  var client;
  try {
    client = getSupabaseClient();
  } catch (error) {
    lists.forEach(function(list) {
      list.textContent = error.message;
      list.classList.add('error');
    });
    forms.forEach(function(form) {
      setStatus(form.querySelector('.form-status'), error.message, true);
      form.querySelector('button[type="submit"]').disabled = true;
    });
    return;
  }
  lists.forEach(function(list) {
    if (list.hasAttribute('data-video-list')) loadVideos(client, list);
    else loadPosts(client, list, list.dataset.postList);
  });
  forms.forEach(function(form) {
    if (form.hasAttribute('data-video-form')) wireVideoForm(client, form);
    else wirePostForm(client, form);
  });
});