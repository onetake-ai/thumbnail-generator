/* ==========================================================================
   Social Media Variation Tool — Application Logic
   ========================================================================== */

// ── State ───────────────────────────────────────────────────────────────────
const state = {
  apiKey: '',
  uploadedImages: [],       // Array of { file, dataUrl }
  textPromptConfig: null,   // Loaded from prompts/text-generation.json
  imagePromptConfig: null,  // Loaded from prompts/image-generation.json
  generatedData: null,      // Result from text generation
};

// ── DOM References ──────────────────────────────────────────────────────────
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const dom = {
  apiKey:             $('#api-key'),
  saveKey:            $('#save-key'),
  toggleKeyVis:       $('#toggle-key-visibility'),
  videoTitle:         $('#video-title'),
  videoTranscript:    $('#video-transcript'),
  imageUploadArea:    $('#image-upload-area'),
  imageInput:         $('#image-input'),
  uploadPlaceholder:  $('#upload-placeholder'),
  imagePreviews:      $('#image-previews'),
  language:           $('#language'),
  generateBtn:        $('#generate-btn'),
  progressSection:    $('#progress-section'),
  progressList:       $('#progress-list'),
  resultsSection:     $('#results-section'),
  titlesGrid:         $('#titles-grid'),
  thumbnailsContainer:$('#thumbnails-container'),
  descriptionsGrid:   $('#descriptions-grid'),
};

// ── Init ────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  await loadPromptConfigs();
  restoreApiKey();
  bindEvents();
});

async function loadPromptConfigs() {
  try {
    const [textRes, imageRes] = await Promise.all([
      fetch('prompts/text-generation.json'),
      fetch('prompts/image-generation.json'),
    ]);
    state.textPromptConfig = await textRes.json();
    state.imagePromptConfig = await imageRes.json();
  } catch (e) {
    console.error('Failed to load prompt configs', e);
    showToast('Failed to load prompt configuration files.', 'error');
  }
}

// ── API Key Management ──────────────────────────────────────────────────────
function restoreApiKey() {
  const saved = localStorage.getItem('openai_api_key');
  if (saved) {
    dom.apiKey.value = saved;
    dom.saveKey.checked = true;
  }
}

function getApiKey() {
  const key = dom.apiKey.value.trim();
  if (dom.saveKey.checked && key) {
    localStorage.setItem('openai_api_key', key);
  } else if (!dom.saveKey.checked) {
    localStorage.removeItem('openai_api_key');
  }
  return key;
}

// ── Event Bindings ──────────────────────────────────────────────────────────
function bindEvents() {
  // Toggle API key visibility
  dom.toggleKeyVis.addEventListener('click', () => {
    const isPassword = dom.apiKey.type === 'password';
    dom.apiKey.type = isPassword ? 'text' : 'password';
    dom.toggleKeyVis.querySelector('.icon-eye').classList.toggle('hidden', !isPassword);
    dom.toggleKeyVis.querySelector('.icon-eye-off').classList.toggle('hidden', isPassword);
  });

  // Color hex ↔ color picker sync
  $$('.color-hex').forEach(hex => {
    const picker = $('#' + hex.dataset.for);
    hex.addEventListener('input', () => {
      const val = hex.value.startsWith('#') ? hex.value : '#' + hex.value;
      if (/^#[0-9A-Fa-f]{6}$/.test(val)) picker.value = val;
    });
    picker.addEventListener('input', () => {
      hex.value = picker.value.toUpperCase();
    });
  });

  // Image upload — click
  dom.imageUploadArea.addEventListener('click', (e) => {
    if (e.target.closest('.remove-image')) return;
    dom.imageInput.click();
  });

  dom.imageInput.addEventListener('change', () => {
    handleImageFiles(dom.imageInput.files);
    dom.imageInput.value = '';
  });

  // Image upload — drag & drop
  dom.imageUploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    dom.imageUploadArea.classList.add('drag-over');
  });
  dom.imageUploadArea.addEventListener('dragleave', () => {
    dom.imageUploadArea.classList.remove('drag-over');
  });
  dom.imageUploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    dom.imageUploadArea.classList.remove('drag-over');
    handleImageFiles(e.dataTransfer.files);
  });

  // Generate button
  dom.generateBtn.addEventListener('click', generate);
}

// ── Image Handling ──────────────────────────────────────────────────────────
function handleImageFiles(files) {
  const remaining = 3 - state.uploadedImages.length;
  if (remaining <= 0) {
    showToast('Maximum 3 images allowed.', 'error');
    return;
  }

  const toAdd = Array.from(files).slice(0, remaining).filter(f => f.type.startsWith('image/'));

  toAdd.forEach(file => {
    const reader = new FileReader();
    reader.onload = (e) => {
      state.uploadedImages.push({ file, dataUrl: e.target.result });
      renderImagePreviews();
    };
    reader.readAsDataURL(file);
  });
}

function renderImagePreviews() {
  dom.imagePreviews.innerHTML = '';
  state.uploadedImages.forEach((img, idx) => {
    const div = document.createElement('div');
    div.className = 'image-preview';
    div.innerHTML = `
      <img src="${img.dataUrl}" alt="Screenshot ${idx + 1}">
      <button class="remove-image" data-idx="${idx}" title="Remove">&times;</button>
    `;
    div.querySelector('.remove-image').addEventListener('click', (e) => {
      e.stopPropagation();
      state.uploadedImages.splice(idx, 1);
      renderImagePreviews();
    });
    dom.imagePreviews.appendChild(div);
  });

  // Hide placeholder if images exist
  if (state.uploadedImages.length > 0) {
    dom.uploadPlaceholder.style.display = 'none';
  } else {
    dom.uploadPlaceholder.style.display = '';
  }
}

// ── Gather Form Data ────────────────────────────────────────────────────────
function getSelectedPlatforms() {
  return Array.from($$('input[name="platform"]:checked')).map(el => el.value);
}

function getColorPalette() {
  return {
    primary:     $('#color-primary').value,
    dark:        $('#color-dark').value,
    light:       $('#color-light').value,
    accent:      $('#color-accent').value,
    soft_accent: $('#color-soft-accent').value,
  };
}

function formatColorPaletteForPrompt(colors) {
  return [
    `- Primary (Golden Grass): ${colors.primary}`,
    `- Dark (Bleached Cedar): ${colors.dark}`,
    `- Light (Alabaster): ${colors.light}`,
    `- Accent (Cabaret): ${colors.accent}`,
    `- Soft Accent (Cold Turkey): ${colors.soft_accent}`,
  ].join('\n');
}

// ── Validation ──────────────────────────────────────────────────────────────
function validate() {
  const key = dom.apiKey.value.trim();
  if (!key) { showToast('Please enter your OpenAI API key.', 'error'); return false; }
  if (!dom.videoTitle.value.trim()) { showToast('Please enter a video title.', 'error'); return false; }
  if (getSelectedPlatforms().length === 0) { showToast('Please select at least one platform.', 'error'); return false; }
  return true;
}

// ── Main Generation Flow ────────────────────────────────────────────────────
async function generate() {
  if (!validate()) return;

  const apiKey = getApiKey();
  const platforms = getSelectedPlatforms();
  const platformLabels = state.imagePromptConfig.platform_labels;

  // Reset UI
  dom.resultsSection.classList.add('hidden');
  dom.progressSection.classList.remove('hidden');
  dom.generateBtn.disabled = true;
  dom.progressList.innerHTML = '';

  // Step 1: Text generation
  addProgressItem('progress-text', 'Generating titles, prompts, and descriptions...');

  try {
    const textResult = await generateText(apiKey, platforms);
    state.generatedData = textResult;
    markProgressDone('progress-text');
  } catch (err) {
    markProgressError('progress-text', `Text generation failed: ${err.message}`);
    dom.generateBtn.disabled = false;
    return;
  }

  // Step 2: Render titles and descriptions immediately and show results
  renderTitles(state.generatedData.titles);
  renderDescriptions(state.generatedData.descriptions, platformLabels);
  dom.resultsSection.classList.remove('hidden');

  // Scroll titles into view so the user sees results right away
  dom.titlesGrid.closest('.card').scrollIntoView({ behavior: 'smooth', block: 'start' });

  // Step 3: Build thumbnail slots with loading spinners, add progress items
  dom.thumbnailsContainer.innerHTML = '';
  const thumbnailTasks = [];
  let totalThumbs = 0;
  let completedThumbs = 0;

  // Add a summary progress item for thumbnails
  addProgressItem('progress-thumbs-summary', `Generating thumbnails (0/${platforms.length * 3})...`);

  for (const platform of platforms) {
    const label = platformLabels[platform] || platform;
    const size = state.imagePromptConfig.size_map[platform] || '1024x1024';

    // Create platform section in DOM
    const sectionId = `thumbs-${platform}`;
    const sectionHtml = `
      <div class="thumbnails-platform" id="${sectionId}">
        <div class="card">
          <h2>${label} Thumbnails</h2>
          <div class="thumbnail-grid" id="grid-${platform}"></div>
        </div>
      </div>
    `;
    dom.thumbnailsContainer.insertAdjacentHTML('beforeend', sectionHtml);

    const grid = $(`#grid-${platform}`);

    // Create 3 thumbnail slots with inline spinners
    for (let i = 0; i < 3; i++) {
      totalThumbs++;
      const cardId = `thumb-${platform}-${i}`;
      const cardHtml = `
        <div class="thumbnail-card" id="${cardId}">
          <div class="thumbnail-image-wrapper">
            <div class="thumbnail-loading">
              <div class="progress-spinner"></div>
              <div>Generating variant ${i + 1}...</div>
            </div>
          </div>
          <div class="thumbnail-actions">
            <span class="thumbnail-label">Variant ${i + 1}</span>
          </div>
        </div>
      `;
      grid.insertAdjacentHTML('beforeend', cardHtml);

      thumbnailTasks.push({ platform, label, index: i, size, cardId });
    }
  }

  // Run all thumbnail generations in parallel, updating progress as each finishes
  const thumbnailPromises = thumbnailTasks.map(task =>
    generateThumbnail(apiKey, task)
      .then(() => {
        completedThumbs++;
        updateThumbsProgress(completedThumbs, totalThumbs);
      })
      .catch(err => {
        completedThumbs++;
        updateThumbsProgress(completedThumbs, totalThumbs);
        const wrapper = $(`#${task.cardId} .thumbnail-image-wrapper`);
        if (wrapper) {
          wrapper.innerHTML = `<div class="thumbnail-loading" style="color: var(--color-accent)">Generation failed: ${err.message}</div>`;
        }
      })
  );

  await Promise.all(thumbnailPromises);
  dom.generateBtn.disabled = false;
}

function updateThumbsProgress(completed, total) {
  const el = $('#progress-thumbs-summary');
  if (!el) return;
  const span = el.querySelector('span');
  if (completed >= total) {
    span.textContent = `All ${total} thumbnails generated.`;
    el.classList.add('done');
  } else {
    span.textContent = `Generating thumbnails (${completed}/${total})...`;
  }
}

// ── Text Generation (gpt-5-mini via Responses API) ─────────────────────────
async function generateText(apiKey, platforms) {
  const config = state.textPromptConfig;
  const platformLabels = state.imagePromptConfig.platform_labels;
  const platformNames = platforms.map(p => platformLabels[p] || p).join(', ');
  const colors = getColorPalette();

  const userPrompt = config.user_prompt_template
    .replace('{{title}}', dom.videoTitle.value.trim())
    .replace('{{transcript}}', dom.videoTranscript.value.trim() || '(not provided)')
    .replace('{{platforms}}', platformNames)
    .replace('{{language}}', dom.language.value)
    .replace('{{color_palette}}', formatColorPaletteForPrompt(colors));

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      instructions: config.system_prompt,
      input: userPrompt,
      text: {
        format: { type: 'json_object' },
      },
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `API error ${response.status}`);
  }

  const data = await response.json();
  const content = data.output_text;
  return JSON.parse(content);
}

// ── Image Generation (gpt-image-1.5) ───────────────────────────────────────
async function generateThumbnail(apiKey, task) {
  const { platform, label, index, size, cardId } = task;
  const config = state.imagePromptConfig;
  const colors = getColorPalette();
  const data = state.generatedData;

  // Build the image generation prompt from the template
  const prompt = config.prompt_template
    .replace(/\{\{platform\}\}/g, label)
    .replace('{{thumbnail_prompt}}', data.thumbnail_prompts[index])
    .replace('{{thumbnail_text}}', data.thumbnail_texts[index])
    .replace('{{primary_color}}', colors.primary)
    .replace('{{dark_color}}', colors.dark)
    .replace('{{light_color}}', colors.light)
    .replace('{{accent_color}}', colors.accent)
    .replace('{{soft_accent_color}}', colors.soft_accent);

  // Build form data for the API call
  const formData = new FormData();
  formData.append('model', config.model);
  formData.append('prompt', prompt);
  formData.append('n', '1');
  formData.append('size', size);
  formData.append('quality', config.quality);

  // Attach reference images
  state.uploadedImages.forEach((img, i) => {
    formData.append('image[]', img.file);
  });

  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `Image API error ${response.status}`);
  }

  const result = await response.json();
  const imageData = result.data[0];
  const imageUrl = imageData.url || `data:image/png;base64,${imageData.b64_json}`;

  // Update the thumbnail card
  const wrapper = $(`#${cardId} .thumbnail-image-wrapper`);
  wrapper.innerHTML = `<img src="${imageUrl}" alt="${label} Thumbnail ${index + 1}">`;

  // Add download button
  const actions = $(`#${cardId} .thumbnail-actions`);
  const downloadBtn = document.createElement('button');
  downloadBtn.className = 'btn-download';
  downloadBtn.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
    Download
  `;
  downloadBtn.addEventListener('click', () => downloadImage(imageUrl, imageData.b64_json, `${platform}-thumb-${index + 1}.png`));
  actions.appendChild(downloadBtn);
}

// ── Download Helper ─────────────────────────────────────────────────────────
async function downloadImage(url, b64, filename) {
  try {
    let blob;
    if (b64) {
      const byteChars = atob(b64);
      const byteArray = new Uint8Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i++) byteArray[i] = byteChars.charCodeAt(i);
      blob = new Blob([byteArray], { type: 'image/png' });
    } else {
      const res = await fetch(url);
      blob = await res.blob();
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
  } catch (e) {
    showToast('Download failed. Try right-clicking the image instead.', 'error');
  }
}

// ── Render Titles ───────────────────────────────────────────────────────────
function renderTitles(titles) {
  const angles = ['Curiosity', 'Benefit', 'Bold'];
  dom.titlesGrid.innerHTML = '';
  titles.forEach((title, i) => {
    const card = document.createElement('div');
    card.className = 'title-card';
    card.innerHTML = `
      <span class="title-number">${angles[i] || `#${i + 1}`}</span>
      <span class="title-text">${escapeHtml(title)}</span>
      <button class="btn-copy" data-text="${escapeAttr(title)}">Copy</button>
    `;
    card.querySelector('.btn-copy').addEventListener('click', handleCopy);
    dom.titlesGrid.appendChild(card);
  });
}

// ── Render Descriptions ─────────────────────────────────────────────────────
function renderDescriptions(descriptions, platformLabels) {
  dom.descriptionsGrid.innerHTML = '';
  for (const [key, text] of Object.entries(descriptions)) {
    const label = platformLabels[key] || key;
    const card = document.createElement('div');
    card.className = 'description-card';
    card.innerHTML = `
      <div class="desc-platform">${escapeHtml(label)}</div>
      <div class="desc-text">${escapeHtml(text)}</div>
      <div class="desc-actions">
        <button class="btn-copy" data-text="${escapeAttr(text)}">Copy</button>
      </div>
    `;
    card.querySelector('.btn-copy').addEventListener('click', handleCopy);
    dom.descriptionsGrid.appendChild(card);
  }
}

// ── Copy to Clipboard ───────────────────────────────────────────────────────
async function handleCopy(e) {
  const btn = e.currentTarget;
  const text = btn.dataset.text;
  try {
    await navigator.clipboard.writeText(text);
    btn.textContent = 'Copied!';
    btn.classList.add('copied');
    setTimeout(() => {
      btn.textContent = 'Copy';
      btn.classList.remove('copied');
    }, 2000);
  } catch {
    showToast('Failed to copy to clipboard.', 'error');
  }
}

// ── Progress Indicators ─────────────────────────────────────────────────────
function addProgressItem(id, text) {
  const div = document.createElement('div');
  div.className = 'progress-item';
  div.id = id;
  div.innerHTML = `<div class="progress-spinner"></div><span>${escapeHtml(text)}</span>`;
  dom.progressList.appendChild(div);
}

function markProgressDone(id) {
  const el = $(`#${id}`);
  if (el) el.classList.add('done');
}

function markProgressError(id, text) {
  const el = $(`#${id}`);
  if (el) {
    el.classList.add('error');
    el.querySelector('span').textContent = text;
  }
}

// ── Toast Notifications ─────────────────────────────────────────────────────
function showToast(message, type = 'error') {
  // Remove existing toast
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add('visible');
  });

  setTimeout(() => {
    toast.classList.remove('visible');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// ── Utilities ───────────────────────────────────────────────────────────────
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function escapeAttr(str) {
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
