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
const postIdInput = document.getElementById("post-id-input");
const serieUrlInput = document.getElementById("serie-url-input");
const tagsContainer = document.getElementById("tags-container");
const newTagInput = document.getElementById("new-tag");
const addTagBtn = document.getElementById("add-tag-btn");
const publicarBtn = document.getElementById("publicarBtn");
const animacion = document.getElementById("animacionPublicar");
const progreso = document.getElementById("progreso");
const seasonInput = document.getElementById("season-input");
const episodeInput = document.getElementById("episode-input");
const loadEpisodeBtn = document.getElementById("load-episode-btn");

let seleccionado = null;
let currentTags = [];
let generatedCode = "";

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
  resultados.innerHTML = `<div class="col-span-full text-center py-12"><div class="animate-spin w-8 h-8 border-4 border-[#00ff7f] border-t-transparent rounded-full mx-auto"></div><p class="mt-4 text-[#00ff7f]">Buscando series...</p></div>`;
  
  fetch(`https://api.themoviedb.org/3/search/tv?api_key=${TMDB_API_KEY}&language=es-MX&query=${encodeURIComponent(term)}`)
    .then(r => r.json())
    .then(data => {
      resultados.innerHTML = "";
      (data.results || []).forEach(item => {
        const poster = item.poster_path ? IMG_BASE + item.poster_path : "https://via.placeholder.com/300x450/111/00ff7f?text=NO+POSTER";
        const year = (item.first_air_date || "").split("-")[0] || "—";
        const card = document.createElement("div");
        card.className = "card relative overflow-hidden rounded-3xl bg-[#111] border border-[#00ff7f]/20 cursor-pointer";
        card.innerHTML = `
          <img src="${poster}" class="w-full aspect-[2/3] object-cover" alt="">
          <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 p-4">
            <div class="font-bold line-clamp-1">${item.name}</div>
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

// ================== CARGAR EPISODIO ==================
async function loadEpisode() {
  if (!seleccionado || !seleccionado.showId) return alert("Primero selecciona una serie");
  const s = parseInt(seasonInput.value) || 1;
  const e = parseInt(episodeInput.value) || 1;
  try {
    const res = await fetch(`https://api.themoviedb.org/3/tv/${seleccionado.showId}/season/${s}/episode/${e}?api_key=${TMDB_API_KEY}&language=es-MX&append_to_response=videos`);
    const data = await res.json();
    if (data.status_code === 34) return alert("Este episodio no existe en TMDB");
    
    seleccionado.seasonNumber = s;
    seleccionado.episodeNumber = e;
    seleccionado.episodeTitle = data.name || `Episodio ${e}`;
    seleccionado.episodeSynopsis = data.overview || seleccionado.sinopsis;
    seleccionado.episodeStill = data.still_path ? IMG_BASE + data.still_path : seleccionado.poster;
    seleccionado.episodeAirDate = data.air_date || "";
    seleccionado.episodeTmdbId = data.id || 0;

    let trailerKey = "__ID_YOUTUBE__";
    const videos = data.videos?.results || [];
    let trailer = videos.find(v => v.site === "YouTube" && (v.type === "Official Trailer" || v.type === "Trailer"));
    if (trailer) trailerKey = trailer.key;
    seleccionado.trailerId = trailerKey;

    modalTitulo.textContent = `${seleccionado.showName} S${s}E${e} - ${seleccionado.episodeTitle}`;
    mPoster.src = seleccionado.episodeStill;
    modalSinopsis.textContent = seleccionado.episodeSynopsis;
    renderTags();
  } catch (err) {
    console.error(err);
    alert("Error al cargar el episodio");
  }
}

// ================== ABRIR MODAL ==================
function abrirFicha(id) {
  modal.classList.remove("hidden");
  modal.classList.add("flex");
  
  fetch(`https://api.themoviedb.org/3/tv/${id}?api_key=${TMDB_API_KEY}&language=es-MX&append_to_response=alternative_titles`)
    .then(r => r.json())
    .then(show => {
      seleccionado = {
        showId: show.id,
        showName: show.name || "Sin título",
        year: (show.first_air_date || "").split("-")[0] || "—",
        poster: show.poster_path ? IMG_BASE + show.poster_path : "",
        backdrop: show.backdrop_path ? IMG_BASE + show.backdrop_path : "",
        sinopsis: show.overview || "Sin sinopsis",
        voto: show.vote_average || 0,
        releaseDate: show.first_air_date || "",
        trailerId: "__ID_YOUTUBE__"
      };

      modalTitulo.textContent = seleccionado.showName;
      mPoster.src = seleccionado.poster;
      modalSinopsis.textContent = seleccionado.sinopsis;
      currentTags = (show.genres || []).map(g => g.name);
      renderTags();

      seasonInput.value = "1";
      episodeInput.value = "1";
      postIdInput.value = "";
      serieUrlInput.value = "";
      videoLink.value = "";

      loadEpisodeBtn.onclick = loadEpisode;
      setTimeout(() => loadEpisode(), 300);
      
      // Reset a modo formulario
      document.getElementById('form-area').classList.remove('hidden');
      document.getElementById('success-area').classList.add('hidden');
    });
}

// ================== GÉNEROS ==================
function renderTags() {
  tagsContainer.innerHTML = "";
  currentTags.forEach((tag, i) => {
    const chip = document.createElement("div");
    chip.className = "chip flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium bg-[#1a1a1a] cursor-pointer";
    chip.innerHTML = `${tag} <span class="text-red-400 text-xl">×</span>`;
    chip.onclick = (e) => { 
      if (e.target.tagName === "SPAN") { 
        currentTags.splice(i, 1); 
        renderTags(); 
      } 
    };
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

// ================== GENERAR CÓDIGO (sin mostrar código) ==================
publicarBtn.onclick = () => {
  if (!seleccionado || !seleccionado.episodeTitle) return alert("Primero carga un episodio (Temporada + Episodio)");
  
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

function formatDate(dateStr) {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  const months = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

function generarCodigo() {
  let videoUrl = fixPlayerUrl(videoLink.value.trim()) || "__ENLACE_DE_VIDEO__";
  const episodeFormatted = `${seleccionado.showName} ${seleccionado.seasonNumber}x${seleccionado.episodeNumber}`;
  const airDateFormatted = formatDate(seleccionado.episodeAirDate);
  const genresStr = currentTags.length ? currentTags.join(",") : "Drama,Misterio";
  const linksComment = `${videoUrl},${videoUrl}`;
  const backdropUrl = seleccionado.episodeStill || seleccionado.backdrop;
  const customPostId = postIdInput.value.trim() || "__POST_ID__";
  const serieUrl = serieUrlInput.value.trim() || "__URL_DE_LA_SERIE__";

  generatedCode = `
<div data-post-type="episode" hidden>
  <img src="${seleccionado.episodeStill || seleccionado.poster}"/>
  <p id="tmdb-synopsis">${seleccionado.episodeSynopsis}</p>
</div>

<!--
Episode,English,Español,Castellano,${airDateFormatted}
${linksComment}
${seleccionado.showId}
-->
<div data-backdrop="${backdropUrl}"
data-player-backdrop="${backdropUrl}"
data-episode-count="${seleccionado.episodeNumber}"
data-season-number="${seleccionado.seasonNumber}"
data-serie-name="${seleccionado.showName}"
data-serie-url="${serieUrl}">
</div>
<header class="post-header">
  <span class="post-header__title">${seleccionado.showName}</span>
  <div class="post-header__meta"><span class="ssn">Temporada ${seleccionado.seasonNumber}</span><span class="num">Episodio ${seleccionado.episodeNumber}</span></div>
</header>
<!-- Enlaces de descarga -->
<!-- Server list -->
<div class="plyer-node" data-selected-lang="lat"></div>
<script>
  const _SV_LINKS = [
    {
        lang: "lat",
        name: "Server 1🔥",
        quality: "HD",
        url: "${videoUrl}",
        tagVideo: false
    }
  ]
</script>

<!--IMPORTANTE

${episodeFormatted}



Episode,id-${customPostId},



-->`.trim();

  // Mostrar éxito dentro del modal
  animacion.classList.add("hidden");
  document.getElementById('form-area').classList.add('hidden');
  document.getElementById('success-area').classList.remove('hidden');
}

// ================== FUNCIONES DE ÉXITO ==================
function copyGeneratedCode() {
  if (!generatedCode) return;
  navigator.clipboard.writeText(generatedCode).then(() => {
    const btn = document.getElementById('copy-success-btn');
    const originalText = btn.innerHTML;
    btn.innerHTML = "✅ COPIADO AL PORTAPAPELES!";
    btn.style.background = "#00ff7f";
    setTimeout(() => {
      btn.innerHTML = originalText;
      btn.style.background = "";
    }, 2200);
  });
}

function downloadGeneratedCode() {
  if (!generatedCode) return;
  const blob = new Blob([generatedCode], { type: "text/html" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = (seleccionado && seleccionado.episodeTitle ? seleccionado.episodeTitle.replace(/[^a-z0-9]/gi, "_") : "capitulo") + ".html";
  a.click();
}

function previewGeneratedCode() {
  if (!generatedCode) return;
  const win = window.open();
  win.document.write(generatedCode);
  win.document.close();
}

function resetModalForNewEpisode() {
  document.getElementById('success-area').classList.add('hidden');
  document.getElementById('form-area').classList.remove('hidden');
}

// ================== AUXILIARES ==================
function cerrarModal() {
  modal.classList.add("hidden");
  modal.classList.remove("flex");
  // Reset para próximo uso
  document.getElementById('form-area').classList.remove('hidden');
  document.getElementById('success-area').classList.add('hidden');
}

document.addEventListener("keydown", e => { 
  if (e.key === "Escape") cerrarModal(); 
});

console.log("%c✅ PANEL LZPLAY listo - Todo dentro del modal (sin Blogger)", "color:#00ff7f; font-size:18px");
