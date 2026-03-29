// ================== CONFIG ==================
const TMDB_API_KEY = "38e497c6c1a043d1341416e80915669f";
const IMG_BASE = "https://image.tmdb.org/t/p/original";

// ================== ELEMENTOS ==================
const buscador = document.getElementById("buscador");
const resultados = document.getElementById("resultados");
const modal = document.getElementById("modal");
const modalTitulo = document.getElementById("modal-titulo");
const mPoster = document.getElementById("m-poster");
const modalSinopsis = document.getElementById("modal-sinopsis");
const videoLink = document.getElementById("videoLink");
const downloadLinkInput = document.getElementById("downloadLink"); // aunque no se use aún
const platformsContainer = document.getElementById("platforms-container");
const tagsContainer = document.getElementById("tags-container");
const newTagInput = document.getElementById("new-tag");
const addTagBtn = document.getElementById("add-tag-btn");
const publicarBtn = document.getElementById("publicarBtn");
const animacion = document.getElementById("animacionPublicar");
const progreso = document.getElementById("progreso");

let seleccionado = null;
let currentTags = [];
let selectedPlatforms = [];
let generatedCode = "";

const availablePlatforms = [
  "Sin Plataforma", "Prime Video", "Apple TV", "HBO Max", "Disney", "Disney JR", "Pixar", "Netflix", "Apple tv",
  "Fox", "Paramount", "Sony", "Sony Animations", "Universal", "Warner Bros", "Marvel", "Marvel JR", "Lego", "DC Comics", "LionsGate",
  "Navidad", "DreamWorks", "Cine Cristiano", "Cartoon Networks", "Nickelodeon", "Vix", "K-Drama", "Anime"
];

// ================== AUTO-FIX PREMIUM PLAYER ==================
function fixPlayerUrl(url) {
  if (!url || typeof url !== "string") return url;
  if (!url.includes("lzrdrz10.github.io/premiumplayer/player.html")) return url;
  try {
    const questionPos = url.indexOf("?");
    if (questionPos === -1) return url;
    const base = url.slice(0, questionPos);
    const queryString = url.slice(questionPos + 1);
    const params = queryString.split("&").map(param => {
      if (param.startsWith("title=")) {
        let title = param.substring(6);
        try { title = decodeURIComponent(title); } catch (e) {}
        try { title = decodeURIComponent(title); } catch (e2) {}
        return "title=" + encodeURIComponent(title);
      }
      return param;
    });
    const fixedUrl = base + "?" + params.join("&");
    if (fixedUrl !== url) console.log("%c✅ Enlace premiumplayer corregido", "color:#00ff7f;font-weight:bold", fixedUrl);
    return fixedUrl;
  } catch (err) {
    console.error("Error al corregir URL:", err);
    return url;
  }
}
videoLink.addEventListener("input", () => { videoLink.value = fixPlayerUrl(videoLink.value); });
videoLink.addEventListener("paste", () => { setTimeout(() => { videoLink.value = fixPlayerUrl(videoLink.value); }, 10); });

// ================== BÚSQUEDA EN VIVO ==================
let timeout = null;
buscador.addEventListener("input", () => {
  clearTimeout(timeout);
  timeout = setTimeout(doSearch, 350);
});

function doSearch() {
  const term = buscador.value.trim();
  if (!term) { resultados.innerHTML = ""; return; }
  resultados.innerHTML = `<div class="col-span-full text-center py-12"><div class="animate-spin w-8 h-8 border-4 border-[#00ff7f] border-t-transparent rounded-full mx-auto"></div><p class="mt-4 text-[#00ff7f]">Buscando películas...</p></div>`;
  
  fetch(`https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&language=es-MX&query=${encodeURIComponent(term)}`)
    .then(r => r.json())
    .then(data => {
      resultados.innerHTML = "";
      (data.results || []).forEach(item => {
        const poster = item.poster_path ? IMG_BASE + item.poster_path : "https://via.placeholder.com/300x450/111/00ff7f?text=NO+POSTER";
        const year = (item.release_date || "").split("-")[0] || "—";
        const card = document.createElement("div");
        card.className = "card relative overflow-hidden rounded-3xl bg-[#111] border border-[#00ff7f]/20 cursor-pointer";
        card.innerHTML = `
          <img src="${poster}" class="w-full aspect-[2/3] object-cover" alt="">
          <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 p-4">
            <div class="font-bold line-clamp-1">${item.title}</div>
            <div class="text-[#00ff7f] text-sm">${year}</div>
          </div>
        `;
        card.onclick = () => abrirFicha(item.id);
        resultados.appendChild(card);
      });
    });
}

// ================== SIMPLIFICAR TÍTULOS ==================
function simplifyTitle(title) {
  let noAccents = title.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  let variants = [noAccents];
  let noHyphen = noAccents.replace(/-/g, '');
  if (noHyphen !== noAccents) variants.push(noHyphen);
  let withSpace = noAccents.replace(/-/g, ' ');
  if (withSpace !== noAccents) variants.push(withSpace);
  if (title.includes(':')) {
    let afterColon = title.split(':')[1].trim();
    let simpAfter = afterColon.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    variants.push(simpAfter);
    let cleanAfter = simpAfter.replace(/[¿?¡!]/g, '').trim();
    if (cleanAfter !== simpAfter) variants.push(cleanAfter);
  }
  let noSpecial = noAccents.replace(/[^a-z0-9 ]/g, '');
  if (noSpecial !== noAccents) variants.push(noSpecial);
  let singularVariants = [];
  variants.forEach(v => {
    let words = v.split(' ');
    let newWords = words.map(w => (w.length > 2 && w.endsWith('s')) ? w.slice(0, -1) : w);
    let sing = newWords.join(' ');
    if (sing !== v) singularVariants.push(sing);
  });
  variants.push(...singularVariants);
  let pluralVariants = [];
  variants.forEach(v => {
    let words = v.split(' ');
    let newWords = words.map(w => (w.length > 2 && !w.endsWith('s')) ? w + 's' : w);
    let plur = newWords.join(' ');
    if (plur !== v) pluralVariants.push(plur);
  });
  variants.push(...pluralVariants);
  let individualWords = new Set();
  variants.forEach(v => {
    v.split(' ').forEach(word => {
      if (word.length > 1) {
        individualWords.add(word);
        if (word.length > 2 && word.endsWith('s')) individualWords.add(word.slice(0, -1));
        else if (word.length > 2) individualWords.add(word + 's');
      }
    });
  });
  variants.push(...individualWords);
  let shortenedVariants = new Set();
  individualWords.forEach(word => {
    if (word.length > 4) {
      for (let i = 0; i < word.length; i++) shortenedVariants.add(word.slice(0, i) + word.slice(i + 1));
    }
  });
  variants.push(...shortenedVariants);
  let prefixVariants = new Set();
  individualWords.forEach(word => {
    if (word.length >= 2) {
      for (let len = 2; len <= word.length; len++) prefixVariants.add(word.slice(0, len));
    }
  });
  variants.push(...prefixVariants);
  return [...new Set(variants)];
}

function isChineseOrJapanese(str) {
  return /[\u3040-\u30ff\u4e00-\u9fff]/.test(str);
}

// ================== ABRIR MODAL ==================
function abrirFicha(id) {
  modal.classList.remove("hidden");
  modal.classList.add("flex");

  const fetchMovie = lang => fetch(`https://api.themoviedb.org/3/movie/${id}?api_key=${TMDB_API_KEY}&language=${lang}&append_to_response=alternative_titles`).then(r => r.json());
  const fetchVideos = () => fetch(`https://api.themoviedb.org/3/movie/${id}/videos?api_key=${TMDB_API_KEY}`).then(r => r.json());

  Promise.all([fetchMovie('es-MX'), fetchMovie('es-ES'), fetchMovie('en-US'), fetchVideos()])
    .then(([pEsMX, pEsES, pEn, videosData]) => {
      seleccionado = {
        id: pEsMX.id,
        titulo: pEsMX.title || "Sin título",
        year: (pEsMX.release_date || "").split("-")[0] || "—",
        poster: pEsMX.poster_path ? IMG_BASE + pEsMX.poster_path : "",
        backdrop: pEsMX.backdrop_path ? IMG_BASE + pEsMX.backdrop_path : "",
        sinopsis: pEsMX.overview || "Sin sinopsis",
        originalTitle: pEsMX.original_title || pEsMX.title,
        runtime: pEsMX.runtime || 0,
        voto: pEsMX.vote_average || 0,
        releaseDate: pEsMX.release_date || ""
      };

      // Trailer automático
      let trailerKey = "__ID_YOUTUBE__";
      const results = videosData.results || [];
      let trailer = results.find(v => v.site === "YouTube" && (v.type === "Official Trailer" || v.type === "Trailer"));
      if (trailer) trailerKey = trailer.key;
      seleccionado.trailerId = trailerKey;

      // Títulos alternativos
      let altList = new Set();
      [pEsMX, pEsES, pEn].forEach(p => {
        if (p.title && !isChineseOrJapanese(p.title)) altList.add(p.title);
        if (p.original_title && !isChineseOrJapanese(p.original_title)) altList.add(p.original_title);
        if (p.alternative_titles?.titles) p.alternative_titles.titles.forEach(t => {
          if (t.title && !isChineseOrJapanese(t.title)) altList.add(t.title);
        });
      });
      let allVariants = [...altList];
      [...altList].forEach(t => simplifyTitle(t).forEach(s => { if (!allVariants.includes(s)) allVariants.push(s); }));
      allVariants.push(...'abcdefghijklmnopqrstuvwxyz'.split(''), seleccionado.id.toString());
      seleccionado.alternativeTitles = [...new Set(allVariants)];

      // UI
      modalTitulo.textContent = `${seleccionado.titulo} (${seleccionado.year})`;
      mPoster.src = seleccionado.poster || seleccionado.backdrop;
      modalSinopsis.textContent = seleccionado.sinopsis;

      selectedPlatforms = ["Sin Plataforma"];
      currentTags = (pEsMX.genres || []).map(g => g.name);

      renderPlatforms();
      renderTags();
      videoLink.value = "";
      downloadLinkInput.value = "";

      // Reset a modo formulario
      document.getElementById('form-area').classList.remove('hidden');
      document.getElementById('success-area').classList.add('hidden');
    });
}

// ================== PLATAFORMAS Y GÉNEROS ==================
function renderPlatforms() {
  platformsContainer.innerHTML = "";
  availablePlatforms.forEach(plataforma => {
    const chip = document.createElement("div");
    chip.className = `chip px-6 py-3 rounded-full text-sm font-medium cursor-pointer border border-[#00ff7f]/30 ${selectedPlatforms.includes(plataforma) ? 'chip-active' : 'bg-[#1a1a1a]'}`;
    chip.textContent = plataforma;
    chip.onclick = () => {
      if (selectedPlatforms.includes(plataforma)) selectedPlatforms = selectedPlatforms.filter(p => p !== plataforma);
      else selectedPlatforms.push(plataforma);
      renderPlatforms();
    };
    platformsContainer.appendChild(chip);
  });
}

function renderTags() {
  tagsContainer.innerHTML = "";
  currentTags.forEach((tag, i) => {
    const chip = document.createElement("div");
    chip.className = "chip flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium bg-[#1a1a1a] cursor-pointer";
    chip.innerHTML = `${tag} <span class="text-red-400 text-xl">×</span>`;
    chip.onclick = (e) => { if (e.target.tagName === "SPAN") { currentTags.splice(i, 1); renderTags(); } };
    tagsContainer.appendChild(chip);
  });
}

addTagBtn.onclick = () => {
  const val = newTagInput.value.trim();
  if (val && !currentTags.includes(val)) {
    currentTags.push(val);
    renderTags();
    newTagInput.value = "";
  }
};

// ================== GENERAR CÓDIGO (dentro del modal) ==================
publicarBtn.onclick = () => {
  if (!seleccionado) return alert("Selecciona una película primero");
  animacion.classList.remove("hidden");
  progreso.style.width = "0%";
  let percent = 0;
  const int = setInterval(() => {
    percent += 18 + Math.random() * 15;
    if (percent > 100) percent = 100;
    progreso.style.width = percent + "%";
    if (percent >= 100) {
      clearInterval(int);
      generarCodigo();
    }
  }, 90);
};

function generarCodigo() {
  const plataformasStr = selectedPlatforms.length ? selectedPlatforms.join(",") : "Sin Plataforma";
  const categorias = `${plataformasStr},Movie,${currentTags.join(",")}`;
  let videoUrl = fixPlayerUrl(videoLink.value.trim()) || "__ENLACE_DE_VIDEO__";
  const titulosAlternos = seleccionado.alternativeTitles.join('\n');
  const durationStr = seleccionado.runtime ? `${seleccionado.runtime} minutes` : "120 minutes";
  const genresStr = currentTags.join(", ");
  const originalTitle = seleccionado.originalTitle || seleccionado.titulo;
  const youtubeId = seleccionado.trailerId || "__ID_YOUTUBE__";

  generatedCode = `
<div data-post-type="movie" hidden>
  <img src="${seleccionado.poster}"/>
  <p id="tmdb-synopsis">${seleccionado.sinopsis}</p>
</div>
<!--more-->
<div class="headline is-small mb-4">
  <h2 class="headline__title">Información</h2>
</div>
<ul class="post-details mb-4"
  data-youtube-id="${youtubeId}"
  data-backdrop="${seleccionado.backdrop}"
  data-player-backdrop="${seleccionado.backdrop}"
  data-imdb="${seleccionado.voto.toFixed(1)}">
  <li data="${seleccionado.titulo}"><span>Título</span>${seleccionado.titulo}</li>
  <li data-original-title="${originalTitle}"><span>Título original</span>${originalTitle}</li>
  <li data-duration="${durationStr}"><span>Duración</span>${durationStr}</li>
  <li data-year="${seleccionado.year}"><span>Año</span>${seleccionado.year}</li>
  <li data-release-date="${seleccionado.releaseDate}"><span>Fecha de lanzamiento:</span>${seleccionado.releaseDate}</li>
  <li data-genres="${genresStr}"><span>Géneros</span>${genresStr}</li>
</ul>
<div class="plyer-node" data-selected-lang="lat"></div>
<div class="plyer-node" data-selected-lang="sub"></div>
<script>
  const _SV_LINKS = [
    {
        lang: "lat",
        name: "🔥SERVER VIP🔥 ",
        quality: "HD",
        url: "${videoUrl}",
        tagVideo: false
    },{
        lang: "sub",
        name: "✅ MultiHost ✅",
        quality: "HD",
        url: "https://unlimplay.com/play.php/embed/movie/${seleccionado.id}",
        tagVideo: false
    }
  ]
</script>
<!-- TÍTULOS ALTERNATIVOS -->
<p style="display:none;">
${seleccionado.year}
${titulosAlternos}
</p>
<!--EXTRAS DATOS
${seleccionado.titulo}
${seleccionado.year},${categorias},
-->`.trim();

  // Cambiar a pantalla de éxito dentro del modal
  animacion.classList.add("hidden");
  document.getElementById('form-area').classList.add('hidden');
  document.getElementById('success-area').classList.remove('hidden');
}

// ================== FUNCIONES DEL ÉXITO (dentro del modal) ==================
function copyGeneratedCode() {
  if (!generatedCode) return;
  navigator.clipboard.writeText(generatedCode).then(() => {
    const btn = document.getElementById('copy-success-btn');
    const original = btn.innerHTML;
    btn.innerHTML = "✅ COPIADO AL PORTAPAPELES!";
    btn.style.background = "#00ff7f";
    setTimeout(() => {
      btn.innerHTML = original;
      btn.style.background = "";
    }, 2200);
  });
}

function downloadGeneratedCode() {
  if (!generatedCode) return;
  const blob = new Blob([generatedCode], { type: "text/html" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = (seleccionado ? seleccionado.titulo.replace(/[^a-z0-9]/gi, "_") : "pelicula") + ".html";
  a.click();
}

function previewGeneratedCode() {
  if (!generatedCode) return;
  const win = window.open();
  win.document.write(generatedCode);
  win.document.close();
}

function resetModalForNewMovie() {
  document.getElementById('success-area').classList.add('hidden');
  document.getElementById('form-area').classList.remove('hidden');
}

// ================== AUXILIARES ==================
function cerrarModal() {
  modal.classList.add("hidden");
  modal.classList.remove("flex");
  // Reset para la próxima vez
  document.getElementById('form-area').classList.remove('hidden');
  document.getElementById('success-area').classList.add('hidden');
}

document.addEventListener("keydown", e => { if (e.key === "Escape") cerrarModal(); });

console.log("%c✅ PANEL LZPLAY listo - Todo dentro del modal (copiar sin salir)", "color:#00ff7f; font-size:18px");
