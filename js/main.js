var VIDEO_BUCKET = 'family-videos';
var VIDEO_MAX_BYTES = 50 * 1024 * 1024;
var MUSIC_BUCKET = 'family-music';
var MUSIC_MAX_BYTES = 20 * 1024 * 1024;
var MUSIC_TYPES = {
  'audio/mpeg': 'mp3',
  'audio/mp4': 'm4a',
  'audio/x-m4a': 'm4a',
  'audio/ogg': 'ogg',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/wave': 'wav',
  'audio/vnd.wave': 'wav'
};
var PHOTO_BUCKET = 'family-photos';
var PHOTO_MAX_BYTES = 10 * 1024 * 1024;
var PHOTO_MAX_FILES = 10;
var PHOTO_TYPES = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp'
};
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
  } else if (post.kind === 'music' && post.video_path) {
    var audio = document.createElement('audio');
    audio.controls = true;
    audio.preload = 'metadata';
    audio.src = client.storage.from(MUSIC_BUCKET).getPublicUrl(post.video_path).data.publicUrl;
    audio.setAttribute('aria-label', post.title);
    article.appendChild(audio);
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
  if (post.kind === 'idea') {
    appendIdeaDiscussion(article, post, client);
  }
  container.appendChild(article);
}

function appendIdeaDiscussion(article, idea, client) {
  var section = document.createElement('section');
  section.className = 'idea-discussion';
  var heading = document.createElement('h5');
  heading.textContent = 'Comments';
  section.appendChild(heading);

  var comments = document.createElement('div');
  comments.className = 'idea-comments';
  comments.dataset.ideaComments = idea.id;
  comments.textContent = 'Loading comments…';
  section.appendChild(comments);

  var form = document.createElement('form');
  form.className = 'idea-comment-form';
  form.dataset.ideaCommentForm = idea.id;

  var nameLabel = document.createElement('label');
  nameLabel.htmlFor = 'comment-name-' + idea.id;
  nameLabel.textContent = 'Your name (optional)';
  form.appendChild(nameLabel);
  var nameInput = document.createElement('input');
  nameInput.id = nameLabel.htmlFor;
  nameInput.name = 'author_name';
  nameInput.type = 'text';
  nameInput.maxLength = 80;
  nameInput.autocomplete = 'name';
  form.appendChild(nameInput);

  var bodyLabel = document.createElement('label');
  bodyLabel.htmlFor = 'comment-body-' + idea.id;
  bodyLabel.textContent = 'Add a comment';
  form.appendChild(bodyLabel);
  var bodyInput = document.createElement('textarea');
  bodyInput.id = bodyLabel.htmlFor;
  bodyInput.name = 'body';
  bodyInput.rows = 3;
  bodyInput.maxLength = 1000;
  bodyInput.required = true;
  form.appendChild(bodyInput);

  var button = document.createElement('button');
  button.className = 'btn';
  button.type = 'submit';
  button.textContent = 'Post comment';
  form.appendChild(button);
  var status = document.createElement('p');
  status.className = 'form-status';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  form.appendChild(status);

  form.addEventListener('submit', async function(event) {
    event.preventDefault();
    var body = bodyInput.value.trim();
    var authorName = nameInput.value.trim() || null;
    if (!body) {
      setStatus(status, 'Please enter a comment.', true);
      return;
    }
    if (body.length > 1000 || (authorName && authorName.length > 80)) {
      setStatus(status, 'Comments are limited to 1,000 characters and names to 80 characters.', true);
      return;
    }
    button.disabled = true;
    setStatus(status, 'Posting comment…', false);
    try {
      var result = await client.from('idea_comments').insert({
        idea_id: idea.id,
        author_name: authorName,
        body: body
      });
      if (result.error) throw result.error;
      form.reset();
      setStatus(status, 'Comment posted.', false);
      await loadIdeaComments(client, idea.id, comments);
    } catch (error) {
      setStatus(status, 'Could not post comment: ' + error.message, true);
    } finally {
      button.disabled = false;
    }
  });

  section.appendChild(form);
  article.appendChild(section);
}

function renderIdeaComment(container, comment) {
  var article = document.createElement('article');
  article.className = 'idea-comment';
  var body = document.createElement('p');
  body.textContent = comment.body;
  article.appendChild(body);

  var metadata = document.createElement('p');
  metadata.className = 'post-meta';
  var time = document.createElement('time');
  time.dateTime = comment.created_at;
  time.textContent = new Date(comment.created_at).toLocaleString();
  metadata.appendChild(time);
  metadata.appendChild(document.createTextNode(' · ' + (comment.author_name || 'Family member')));
  article.appendChild(metadata);
  container.appendChild(article);
}

async function loadIdeaComments(client, ideaId, container) {
  try {
    var result = await client.from('idea_comments')
      .select('id, idea_id, author_name, body, created_at')
      .eq('idea_id', ideaId).order('created_at', { ascending: true });
    if (result.error) throw result.error;
    container.replaceChildren();
    if (result.data.length === 0) {
      container.textContent = 'No comments yet. Start the conversation.';
      return;
    }
    result.data.forEach(function(comment) { renderIdeaComment(container, comment); });
  } catch (error) {
    container.textContent = 'Could not load comments: ' + error.message;
    container.classList.add('error');
  }
}

async function loadIdeaCommentsForPosts(client, ideas) {
  if (ideas.length === 0) return;
  var ideaIds = ideas.map(function(idea) { return idea.id; });
  var containers = new Map(Array.from(document.querySelectorAll('[data-idea-comments]'))
    .map(function(container) { return [container.dataset.ideaComments, container]; }));
  try {
    var result = await client.from('idea_comments')
      .select('id, idea_id, author_name, body, created_at')
      .in('idea_id', ideaIds).order('created_at', { ascending: true });
    if (result.error) throw result.error;
    var commentsByIdea = new Map();
    result.data.forEach(function(comment) {
      if (!commentsByIdea.has(comment.idea_id)) commentsByIdea.set(comment.idea_id, []);
      commentsByIdea.get(comment.idea_id).push(comment);
    });
    ideaIds.forEach(function(ideaId) {
      var container = containers.get(ideaId);
      if (!container) return;
      container.replaceChildren();
      var comments = commentsByIdea.get(ideaId) || [];
      if (comments.length === 0) {
        container.textContent = 'No comments yet. Start the conversation.';
      } else {
        comments.forEach(function(comment) { renderIdeaComment(container, comment); });
      }
    });
  } catch (error) {
    ideaIds.forEach(function(ideaId) {
      var container = containers.get(ideaId);
      if (container) {
        container.textContent = 'Could not load comments: ' + error.message;
        container.classList.add('error');
      }
    });
  }
}

function appendPhoto(container, post, client) {
  var article = document.createElement('article');
  article.className = 'photo-item';
  var imageUrl = client.storage.from(PHOTO_BUCKET).getPublicUrl(post.video_path).data.publicUrl;
  var image = document.createElement('img');
  image.src = imageUrl;
  image.alt = post.title;
  image.dataset.full = imageUrl;
  image.loading = 'lazy';
  article.appendChild(image);
  if (post.author_name) {
    var caption = document.createElement('p');
    caption.className = 'post-meta';
    caption.textContent = post.author_name;
    article.appendChild(caption);
  }
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
    if (kind === 'idea') await loadIdeaCommentsForPosts(client, result.data);
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

async function loadMusic(client, container) {
  try {
    var result = await client.from('content_posts')
      .select('id, kind, title, author_name, video_path, created_at')
      .eq('kind', 'music').order('created_at', { ascending: false });
    if (result.error) throw result.error;
    container.replaceChildren();
    if (result.data.length === 0) {
      container.textContent = 'No music has been uploaded yet.';
      return;
    }
    result.data.forEach(function(post) { appendPost(container, post, client); });
  } catch (error) {
    container.textContent = 'Could not load music: ' + error.message;
    container.classList.add('error');
  }
}

async function loadPhotos(client, container) {
  try {
    var result = await client.from('content_posts')
      .select('id, kind, title, author_name, video_path, created_at')
      .eq('kind', 'photo').order('created_at', { ascending: false });
    if (result.error) throw result.error;
    container.replaceChildren();
    if (result.data.length === 0) {
      container.textContent = 'No photos have been uploaded yet.';
      return;
    }
    result.data.forEach(function(post) { appendPhoto(container, post, client); });
  } catch (error) {
    container.textContent = 'Could not load photos: ' + error.message;
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

function wireMusicForm(client, form) {
  form.addEventListener('submit', async function(event) {
    event.preventDefault();
    var status = form.querySelector('.form-status');
    var button = form.querySelector('button[type="submit"]');
    var title = form.elements.title.value.trim();
    var authorName = form.elements.author_name.value.trim() || null;
    var file = form.elements.music.files[0];
    if (!title || !file) {
      setStatus(status, 'Enter a song title and choose an audio file.', true);
      return;
    }
    if (!Object.prototype.hasOwnProperty.call(MUSIC_TYPES, file.type)) {
      setStatus(status, 'Choose an MP3, M4A, OGG, or WAV audio file.', true);
      return;
    }
    if (file.size === 0 || file.size > MUSIC_MAX_BYTES) {
      setStatus(status, 'The audio file must be larger than 0 bytes and no larger than 20 MB.', true);
      return;
    }
    button.disabled = true;
    setStatus(status, 'Uploading music…', false);
    try {
      var path = 'music/' + crypto.randomUUID() + '.' + MUSIC_TYPES[file.type];
      var upload = await client.storage.from(MUSIC_BUCKET).upload(path, file, {
        contentType: file.type,
        upsert: false
      });
      if (upload.error) throw upload.error;
      var result = await client.from('content_posts').insert({
        kind: 'music',
        title: title,
        author_name: authorName,
        body: '',
        video_path: path
      });
      if (result.error) {
        throw new Error('The audio uploaded but its post could not be saved: ' + result.error.message + ' Contact the site administrator to remove the unused upload.');
      }
      form.reset();
      setStatus(status, 'Music uploaded and published successfully.', false);
      var list = document.querySelector('[data-music-list]');
      if (list) await loadMusic(client, list);
    } catch (error) {
      setStatus(status, 'Could not publish music: ' + error.message, true);
    } finally {
      button.disabled = false;
    }
  });
}

function wirePhotoForm(client, form) {
  form.addEventListener('submit', async function(event) {
    event.preventDefault();
    var status = form.querySelector('.form-status');
    var button = form.querySelector('button[type="submit"]');
    var files = Array.from(form.elements.photos.files);
    var authorName = form.elements.author_name.value.trim() || null;
    if (files.length === 0 || files.length > PHOTO_MAX_FILES) {
      setStatus(status, 'Choose between 1 and 10 photos to upload.', true);
      return;
    }
    for (var file of files) {
      if (!Object.prototype.hasOwnProperty.call(PHOTO_TYPES, file.type)) {
        setStatus(status, file.name + ' is not a supported photo. Choose JPG, PNG, or WebP files.', true);
        return;
      }
      if (file.size === 0 || file.size > PHOTO_MAX_BYTES) {
        setStatus(status, file.name + ' must be larger than 0 bytes and no larger than 10 MB.', true);
        return;
      }
    }
    button.disabled = true;
    var published = 0;
    setStatus(status, 'Uploading photos… (0 of ' + files.length + ')', false);
    try {
      for (var photo of files) {
        var path = 'photos/' + crypto.randomUUID() + '.' + PHOTO_TYPES[photo.type];
        var upload = await client.storage.from(PHOTO_BUCKET).upload(path, photo, {
          contentType: photo.type,
          upsert: false
        });
        if (upload.error) throw upload.error;
        var result = await client.from('content_posts').insert({
          kind: 'photo',
          title: photo.name.replace(/\.[^.]+$/, '').slice(0, 120) || 'Family photo',
          author_name: authorName,
          body: '',
          video_path: path
        });
        if (result.error) {
          throw new Error('Photo uploaded but its post could not be saved: ' + result.error.message + ' Contact the site administrator to remove the unused upload.');
        }
        published++;
        setStatus(status, 'Uploading photos… (' + published + ' of ' + files.length + ')', false);
      }
      form.reset();
      setStatus(status, published + (published === 1 ? ' photo' : ' photos') + ' uploaded and published successfully.', false);
      var list = document.querySelector('[data-photo-list]');
      if (list) await loadPhotos(client, list);
    } catch (error) {
      var message = 'Could not upload photo' + (published === 1 ? '' : 's') + ': ' + error.message;
      if (published > 0) message += ' ' + published + ' photo' + (published === 1 ? ' was' : 's were') + ' already published.';
      setStatus(status, message, true);
      var photoList = document.querySelector('[data-photo-list]');
      if (photoList && published > 0) await loadPhotos(client, photoList);
    } finally {
      button.disabled = false;
    }
  });
}

document.addEventListener('DOMContentLoaded', function() {
  var slideshow = document.querySelector('[data-site-slideshow]');
  if (slideshow) {
    var slides = slideshow.querySelectorAll('.site-slideshow__image');
    var backgrounds = [
      'assets/slideshow-portrait.png',
      'assets/home-portrait.jpg'
    ];
    var activeSlide = 0;
    var nextBackground = 0;
    var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var slideshowToggle = document.querySelector('[data-slideshow-toggle]');
    var slideshowTimer;
    var paused = reducedMotion;

    function showNextBackground() {
      var source = backgrounds[nextBackground];
      nextBackground = (nextBackground + 1) % backgrounds.length;
      var image = new Image();
      image.onload = function() {
        var nextSlide = 1 - activeSlide;
        slides[nextSlide].style.backgroundImage = 'url("' + source + '")';
        slides[nextSlide].classList.add('is-visible');
        slides[activeSlide].classList.remove('is-visible');
        activeSlide = nextSlide;
      };
      image.src = source;
    }

    function pauseSlideshow() {
      paused = true;
      window.clearInterval(slideshowTimer);
      if (slideshowToggle) {
        slideshowToggle.textContent = 'Play background photos';
        slideshowToggle.setAttribute('aria-pressed', 'true');
      }
    }

    function playSlideshow() {
      paused = false;
      showNextBackground();
      slideshowTimer = window.setInterval(showNextBackground, 8000);
      if (slideshowToggle) {
        slideshowToggle.textContent = 'Pause background photos';
        slideshowToggle.setAttribute('aria-pressed', 'false');
      }
    }

    showNextBackground();
    if (reducedMotion) {
      pauseSlideshow();
    } else {
      slideshowTimer = window.setInterval(showNextBackground, 8000);
    }
    if (slideshowToggle) {
      slideshowToggle.addEventListener('click', function() {
        if (paused) playSlideshow();
        else pauseSlideshow();
      });
    }
  }

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

  var gallery = document.querySelector('.gallery');
  var lightbox = document.getElementById('lightbox');
  var lightboxImage = document.getElementById('lbImg');
  var closeLightbox = document.getElementById('closeLb');
  if (gallery && lightbox && lightboxImage) {
    gallery.addEventListener('click', function(event) {
      var image = event.target.closest('img');
      if (!image || !gallery.contains(image)) return;
      lightboxImage.src = image.dataset.full || image.src;
      lightboxImage.alt = image.alt;
      lightbox.hidden = false;
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

  var lists = Array.from(document.querySelectorAll('[data-post-list], [data-video-list], [data-music-list], [data-photo-list]'));
  var forms = Array.from(document.querySelectorAll('[data-post-form], [data-video-form], [data-music-form], [data-photo-form]'));
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
      if (form.querySelector('.form-status')) setStatus(form.querySelector('.form-status'), error.message, true);
      form.querySelector('button[type="submit"]').disabled = true;
    });
    return;
  }
  lists.forEach(function(list) {
    if (list.hasAttribute('data-video-list')) loadVideos(client, list);
    else if (list.hasAttribute('data-music-list')) loadMusic(client, list);
    else if (list.hasAttribute('data-photo-list')) loadPhotos(client, list);
    else loadPosts(client, list, list.dataset.postList);
  });
  forms.forEach(function(form) {
    if (form.hasAttribute('data-video-form')) wireVideoForm(client, form);
    else if (form.hasAttribute('data-music-form')) wireMusicForm(client, form);
    else if (form.hasAttribute('data-photo-form')) wirePhotoForm(client, form);
    else wirePostForm(client, form);
  });
});