import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, where, doc, updateDoc, arrayUnion, arrayRemove, increment, getDoc, setDoc, serverTimestamp, deleteDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut, deleteUser } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-storage.js";

const firebaseConfig = {
    apiKey: "AIzaSyDVRkOh1x2QSmn_SuuNlYEF51FNNj1oapk",
    authDomain: "plus-7bb95.firebaseapp.com",
    projectId: "plus-7bb95",
    storageBucket: "plus-7bb95.firebasestorage.app",
    messagingSenderId: "794281987667",
    appId: "1:794281987667:web:4416005ed2b652893ec0a6"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

let currentUser = null; 
let datosMiPerfilGlobal = null;
let usuariosGlobales = [];
let cacheTodosLosPosts = [];
let notificacionesGlobales = [];

let desubscribirPosts = null, desubscribirUsuarios = null, desubscribirNotif = null, desubscribirChatMensajes = null, desubscribirStories = null, desubscribirTyping = null;

let chatUserUidActivo = null;
let temporizadorHistoria = null;
let perfilAjenoUidActivo = null;
let modoBusquedaActual = 'usuarios';
let typingTimeout = null;

// Variables WebRTC y Audio
let localStream = null;
let remoteStream = null;
let peerConnection = null;
let llamadaActualId = null;
let unsubscribeLlamadaActiva = null;
let llamadasEntrantesUnsubscribe = null;
const iceServers = { iceServers: [{ urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'], credential: "", username: "" }] };

const audioRing = new Audio('https://actions.google.com/sounds/v1/alarms/digital_watch_alarm_long.ogg');
const audioDial = new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg');
audioRing.loop = true; audioDial.loop = true;

// Crear elemento de audio oculto nativo para asegurar la salida de voz en celulares
const remoteAudioNode = document.createElement('audio');
remoteAudioNode.autoplay = true;
document.body.appendChild(remoteAudioNode);

// --- COMPRESIÓN DE IMÁGENES NATIVA ---
async function comprimirImagen(file) {
    if (!file.type.startsWith('image/')) return file; // Si es video u otro, saltar
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 800;
                const scale = MAX_WIDTH / img.width;
                canvas.width = MAX_WIDTH;
                canvas.height = img.height * scale;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.7);
            };
        };
    });
}

function formatearFecha(timestamp) {
    if (!timestamp) return "Ahora";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const ahora = new Date();
    const difSegundos = Math.floor((ahora - date) / 1000);
    if (difSegundos < 60) return "Ahora";
    const difMinutos = Math.floor(difSegundos / 60);
    if (difMinutos < 60) return `${difMinutos} min`;
    const difHoras = Math.floor(difMinutos / 60);
    if (difHoras < 24) return `${difHoras} h`;
    return date.toLocaleDateString();
}

function procesarTextoConHashtags(texto) {
    if(!texto) return "";
    const escapado = texto.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    return escapado.replace(/#(\w+)/g, `<span class="hashtag" onclick="buscarTagDirecto('$1', event)">#$1</span>`);
}

function mostrarMuro() { document.getElementById('auth-screen').classList.add('hidden'); document.getElementById('main-screen').classList.remove('hidden'); navegarA('inicio'); }
function mostrarLogin() {
    document.getElementById('auth-screen').classList.remove('hidden'); document.getElementById('main-screen').classList.add('hidden');
    if(desubscribirPosts) desubscribirPosts(); if(desubscribirUsuarios) desubscribirUsuarios();
    if(desubscribirNotif) desubscribirNotif(); if(desubscribirStories) desubscribirStories();
    if(llamadasEntrantesUnsubscribe) llamadasEntrantesUnsubscribe();
    cerrarChatActivo(); terminarVisorHistoria(); finalizarLlamada();
    datosMiPerfilGlobal = null; usuariosGlobales = []; cacheTodosLosPosts = []; notificacionesGlobales = [];
}

function navegarA(tab) {
    const tabs = ['inicio', 'buscar', 'publicar', 'explorar', 'perfil', 'notificaciones', 'mensajes', 'perfil-ajeno'];
    tabs.forEach(t => { document.getElementById(`tab-${t}`)?.classList.add('hidden'); document.getElementById(`btn-tab-${t}`)?.classList.remove('active'); });
    
    const targetTab = document.getElementById(`tab-${tab}`);
    if(targetTab) targetTab.classList.remove('hidden');
    document.getElementById(`btn-tab-${tab}`)?.classList.add('active');
    
    if(tab === 'notificaciones') { localStorage.setItem('lastCheckedNotif', Date.now().toString()); document.getElementById('badge-notif').classList.add('hidden'); }
    if(tab === 'mensajes') { 
        cerrarChatActivo(); 
        localStorage.setItem('lastCheckedMensajes', Date.now().toString()); 
        document.getElementById('badge-mensajes').classList.add('hidden'); 
        actualizarMurosYFeed();
    }
    if(tab !== 'perfil-ajeno') perfilAjenoUidActivo = null;
}

async function subirImagenPerfil(file, tipo) {
    if(!currentUser) return;
    const btnId = tipo === 'perfil' ? 'btn-cambiar-foto' : 'btn-cambiar-portada';
    const btn = document.getElementById(btnId);
    const originalText = btn.innerText; btn.innerText = "⏳ Subiendo...";
    try {
        const imgBlob = await comprimirImagen(file);
        const storageRef = ref(storage, (tipo === 'perfil' ? 'perfiles/' : 'portadas/') + currentUser.uid + '_' + Date.now());
        await uploadBytes(storageRef, imgBlob);
        const url = await getDownloadURL(storageRef);
        await updateDoc(doc(db, "users", currentUser.uid), tipo === 'perfil' ? { profilePic: url } : { coverPic: url });
        btn.innerText = "✅ Listo!"; setTimeout(() => { btn.innerText = originalText; }, 2500);
    } catch(e) { btn.innerText = originalText; }
}

function dibujarPosts(listaDePosts, contenedorId = 'feed-container') {
    const contenedor = document.getElementById(contenedorId);
    if (!contenedor) return;
    if (listaDePosts.length === 0) { contenedor.innerHTML = '<p style="color:var(--texto-gris); text-align:center; padding: 20px;">No hay publicaciones aquí.</p>'; return; }
    
    let html = "";
    listaDePosts.forEach(post => {
        const likes = post.likes || []; const comments = post.comments || [];
        const yaDioLike = currentUser && likes.includes(currentUser.uid);
        const btnEliminar = (currentUser && post.uid === currentUser.uid) ? `<button style="background:none; border:none; color:#ff4a5a; cursor:pointer;" onclick="eliminarPost('${post.id}')">🗑️</button>` : '';
        const btnReportar = (currentUser && post.uid !== currentUser.uid) ? `<button style="background:none; border:none; color:var(--texto-gris); cursor:pointer; font-size:18px;" onclick="reportarPublicacion('${post.id}')">⋮</button>` : '';

        let comentariosHtml = "";
        if(comments.length > 0) {
            comentariosHtml = `<div class="comment-section">';`;
            comments.forEach((c) => { 
                const encodedComment = encodeURIComponent(JSON.stringify(c));
                const puedeBorrarC = (currentUser && (post.uid === currentUser.uid || c.username === datosMiPerfilGlobal?.username));
                const btnBorrarC = puedeBorrarC ? `<button style="background:none; border:none; color:#ff4a5a; font-size:11px; cursor:pointer; margin-left:10px;" onclick="borrarComentario('${post.id}', '${encodedComment}')">Borrar</button>` : '';
                comentariosHtml += `<div style="margin-bottom: 5px; display:flex; justify-content:space-between;"><span><b>@${c.username}:</b> <span style="color: var(--texto-gris);">${c.text}</span></span> ${btnBorrarC}</div>`; 
            });
            comentariosHtml += `</div>`;
        }

        // Renderizado adaptivo para fotos o videos en el feed
        let multimediaHtml = '';
        if (post.imageUrl) {
            if (post.isVideo || post.imageUrl.includes('.mp4') || post.imageUrl.includes('video%2F')) {
                multimediaHtml = `<video src="${post.imageUrl}" controls class="post-img" style="max-height:350px; background:#000;"></video>`;
            } else {
                multimediaHtml = `<img src="${post.imageUrl}" class="post-img">`;
            }
        }

        const esRepulse = post.isRepulse ? `<div style="font-size: 11px; color: var(--texto-gris); margin-bottom: 8px; font-weight: bold;">🔁 Re-pulsado de @${post.originalAuthor}</div>` : '';

        html += `
            <div class="custom-card">
                ${esRepulse}
                <div class="card-top">
                    <span style="color: var(--texto-blanco); cursor:pointer;" onclick="verPerfilUsuario('${post.uid}')">@${post.username || "anonimo"} <span style="color:var(--texto-gris); font-size:11px; margin-left:5px;">• ${formatearFecha(post.timestamp)}</span></span>
                    <div>${btnEliminar}${btnReportar}</div>
                </div>
                <p class="card-main-text">${procesarTextoConHashtags(post.text)}</p>
                ${multimediaHtml}
                <div class="action-bar">
                    <button class="action-btn ${yaDioLike ? 'liked' : ''}" onclick="darLike('${post.id}', '${post.uid}')">❤️ <span>${likes.length}</span></button>
                    <button class="action-btn" onclick="comentarPost('${post.id}')">💬 ${comments.length}</button>
                    <button class="action-btn" onclick="hacerRepulse('${post.id}')">🔁</button>
                </div>
                ${comentariosHtml}
            </div>`;
    });
    contenedor.innerHTML = html;
}

function generarHtmlUsuario(user) {
    const yaLoSigo = datosMiPerfilGlobal?.following?.includes(user.uid);
    return `<div class="custom-card" style="display:flex; justify-content:space-between; align-items:center;">
            <div style="cursor:pointer;" onclick="verPerfilUsuario('${user.uid}')">
                <span style="font-weight:bold; color:var(--texto-blanco);">@${user.username}</span><br>
                <small style="color:var(--texto-gris);">${user.bio || 'Nuevo en plus.'}</small>
            </div>
            <button class="btn-follow-action ${yaLoSigo ? 'following' : ''}" onclick="toggleSeguirUsuario('${user.uid}')">${yaLoSigo ? 'Siguiendo' : 'Seguir'}</button>
        </div>`;
}

function verSeguidores(targetUid) { const seguidores = usuariosGlobales.filter(u => u.following && u.following.includes(targetUid)); document.getElementById('modal-lista-titulo').innerText = 'Seguidores'; document.getElementById('modal-lista-contenido').innerHTML = seguidores.length ? seguidores.map(generarHtmlUsuario).join('') : "<p style='text-align:center;'>Sin seguidores.</p>"; document.getElementById('modal-lista-usuarios').classList.remove('hidden'); }
function verSiguiendo(targetUid) { const t = usuariosGlobales.find(u => u.uid === targetUid) || (targetUid === currentUser.uid ? datosMiPerfilGlobal : null); const list = t?.following || []; const seguidos = usuariosGlobales.filter(u => list.includes(u.uid)); document.getElementById('modal-lista-titulo').innerText = 'Siguiendo'; document.getElementById('modal-lista-contenido').innerHTML = seguidos.length ? seguidos.map(generarHtmlUsuario).join('') : "<p style='text-align:center;'>No sigue a nadie.</p>"; document.getElementById('modal-lista-usuarios').classList.remove('hidden'); }
function cerrarModalListaUI() { document.getElementById('modal-lista-usuarios').classList.add('hidden'); }

function actualizarMurosYFeed() {
    if (!datosMiPerfilGlobal || cacheTodosLosPosts.length === 0) { return; }
    const bloqueados = datosMiPerfilGlobal.blockedUsers || [];
    const postsLimpios = cacheTodosLosPosts.filter(p => !bloqueados.includes(p.uid));
    const misSiguiendo = datosMiPerfilGlobal.following || [];
    
    dibujarPosts(postsLimpios.filter(p => p.uid === currentUser.uid || misSiguiendo.includes(p.uid)), 'feed-container');
    dibujarTendencias(postsLimpios); 
    if (perfilAjenoUidActivo) actualizarVistaPerfilAjeno(postsLimpios);
    
    const otrosLimpios = usuariosGlobales.filter(u => u.uid !== currentUser.uid && !bloqueados.includes(u.uid));
    const uCont = document.getElementById('users-container'); if(uCont) uCont.innerHTML = otrosLimpios.length ? otrosLimpios.map(generarHtmlUsuario).join('') : '<p>Sin recomendaciones.</p>';
    dibujarListaContactosChat(otrosLimpios);
}

function dibujarTendencias(postsLimpios) {
    const pops = [...postsLimpios].sort((a, b) => (b.likes?.length || 0) - (a.likes?.length || 0)).slice(0, 3);
    const trendCont = document.getElementById('trending-container');
    if(trendCont) trendCont.innerHTML = pops.length ? pops.map((post, i) => `<div class="custom-card" onclick="verPerfilUsuario('${post.uid}')"><div class="card-top"><span>#${i + 1} Tendencia</span></div><p style="margin:5px 0;">${procesarTextoConHashtags(post.text)}</p></div>`).join('') : "<p>No hay tendencias.</p>";
}

function dibujarListaContactosChat(lista) { 
    if(!currentUser) return;
    let contactos = lista.map(u => {
        const msgs = notificacionesGlobales.filter(n => n.type === 'message' && n.fromUsername === u.username);
        const lastMsg = msgs.sort((a,b) => (b.timestamp?.toMillis()||0) - (a.timestamp?.toMillis()||0))[0];
        return { ...u, lastMsg };
    });
    contactos.sort((a, b) => ((b.lastMsg?.timestamp?.toMillis()||0) - (a.lastMsg?.timestamp?.toMillis()||0)));

    const listCont = document.getElementById('chat-users-list');
    if(!listCont) return;
    listCont.innerHTML = contactos.map(u => {
        const avatarHtml = u.profilePic ? `<img src="${u.profilePic}" style="width:100%; height:100%; object-fit:cover;">` : `👤`;
        let prevText = "Toca para conversar..."; let unreadDot = "";
        
        if (u.lastMsg) {
            prevText = u.lastMsg.text || "📷 Archivo multimedia";
            const lastCheckedMensajes = parseInt(localStorage.getItem('lastCheckedMensajes') || "0");
            if (u.lastMsg.timestamp && u.lastMsg.timestamp.toMillis() > lastCheckedMensajes) {
                unreadDot = `<span style="background:#ff4a5a; width:10px; height:10px; border-radius:50%; display:inline-block; margin-left:5px;"></span>`;
                prevText = `<span style="color:var(--texto-blanco); font-weight:bold;">${prevText}</span>`;
            }
        }
        return `
        <div class="chat-list-item" onclick="verPerfilUsuario('${u.uid}')" style="display:flex; align-items:center;">
            <div class="chat-list-avatar" onclick="event.stopPropagation(); abrirChatCon('${u.uid}', '${u.username}')">${avatarHtml}</div>
            <div class="chat-list-info" onclick="event.stopPropagation(); abrirChatCon('${u.uid}', '${u.username}')" style="flex:1; margin-left:10px;">
                <div style="display:flex; justify-content:space-between;"><p class="chat-list-name">${u.username}</p>${unreadDot}</div>
                <p class="chat-list-preview">${prevText}</p>
            </div>
        </div>`;
    }).join(''); 
}

function renderHeaderPerfil(user, isMe) {
    const avatarHtml = user.profilePic ? `<img src="${user.profilePic}">` : `👤`;
    const bannerHtml = user.coverPic ? `<img src="${user.coverPic}" class="cover-photo">` : `<div class="cover-photo"></div>`;
    const yaLoSigo = datosMiPerfilGlobal?.following?.includes(user.uid);
    
    const btnSeguirHtml = !isMe ? `<button class="btn-plus ${yaLoSigo ? 'btn-plus-sec' : ''}" style="width:auto; padding:8px 20px; border-radius:20px; margin-top:10px;" onclick="toggleSeguirUsuario('${user.uid}')">${yaLoSigo ? 'Siguiendo' : 'Seguir'}</button>` : '';
    const btnMensajeHtml = (!isMe && yaLoSigo) ? `<button class="btn-plus-sec" style="width:auto; padding:8px 20px; border-radius:20px; margin-top:10px; margin-left:8px;" onclick="abrirChatCon('${user.uid}', '${user.username}')">💬 Chat</button>` : '';
    const btnBloquearHtml = (!isMe) ? `<button class="btn-plus-sec" style="width:auto; padding:8px 15px; border-radius:20px; margin-top:10px; margin-left:8px; color: #ff4a5a;" onclick="bloquearPersona('${user.uid}')">🚫</button>` : '';

    return `
        <div class="profile-card-header">${bannerHtml}<div class="avatar-circle overlap">${avatarHtml}</div>
            <div class="profile-info"><h2>@${user.username}</h2><p>${procesarTextoConHashtags(user.bio || 'Sin biografía')}</p>
                <div style="display:flex; justify-content:center;">${btnSeguirHtml} ${btnMensajeHtml} ${btnBloquearHtml}</div>
            </div>
        </div>
        <div class="stats-row">
            <div class="stat-box" onclick="verSeguidores('${user.uid}')"><span>${user.followersCount || 0}</span><label>Seguidores</label></div>
            <div class="stat-box" onclick="verSiguiendo('${user.uid}')"><span>${user.following?.length || 0}</span><label>Siguiendo</label></div>
        </div>`;
}

function dibujarMiPerfil() { if(datosMiPerfilGlobal) { const pCont = document.getElementById('profile-container'); if(pCont) pCont.innerHTML = renderHeaderPerfil(datosMiPerfilGlobal, true); } }
function actualizarVistaPerfilAjeno(postsLimpios = null) {
    if(!perfilAjenoUidActivo) return; const u = usuariosGlobales.find(x => x.uid === perfilAjenoUidActivo);
    if(u) { 
        document.getElementById('user-profile-container').innerHTML = renderHeaderPerfil(u, false); 
        dibujarPosts(postsLimpios || cacheTodosLosPosts.filter(p => p.uid === u.uid), 'user-feed-container'); 
    }
}
function verPerfilUsuario(uid) { if(currentUser && uid === currentUser.uid) navegarA('perfil'); else { perfilAjenoUidActivo = uid; navegarA('perfil-ajeno'); actualizarMurosYFeed(); } }

function dibujarNotificaciones(lista) {
    const bloqueados = datosMiPerfilGlobal?.blockedUsers || [];
    const listaLimpia = lista.filter(n => !bloqueados.includes(usuariosGlobales.find(u => u.username === n.fromUsername)?.uid));
    const notCont = document.getElementById('notifications-container');
    if(!notCont) return;
    notCont.innerHTML = listaLimpia.length ? listaLimpia.sort((a, b) => (b.timestamp?.toMillis() || 0) - (a.timestamp?.toMillis() || 0)).map(n => {
        let icono = '👾'; let accion = 'te sigue';
        if(n.type === 'like') { icono = '🚀'; accion = 'le gustó tu pulso'; }
        if(n.type === 'repulse') { icono = '🔁'; accion = 're-pulsó tu publicación'; }
        if(n.type === 'message') { icono = '💬'; accion = 'te envió un mensaje'; }
        return `<div class="notif-item"><p class="notif-text">${icono} ${n.fromUsername} ${accion}</p><p class="notif-time">${formatearFecha(n.timestamp)}</p></div>`;
    }).join('') : '<p style="text-align:center; padding: 20px; color: var(--texto-gris);">Sin actividad reciente.</p>';
}

function dibujarHistoriasBarra(lista) {
    let html = `<div><div class="story-circle create" onclick="solicitarCrearHistoria()">＋</div><div class="story-username">Tú</div></div>`;
    const limite = Date.now() - 86400000; const vistos = [];
    const bloqueados = datosMiPerfilGlobal?.blockedUsers || [];
    
    lista.filter(s => (s.timestamp?.toMillis() || Date.now()) > limite && !bloqueados.includes(s.uid)).forEach(s => { 
        if(!vistos.includes(s.uid)) { 
            vistos.push(s.uid); 
            const encodedUrl = encodeURIComponent(s.mediaUrl || '');
            const esVideo = s.isVideo ? 'true' : 'false';
            html += `<div><div class="story-circle" onclick="reproducirHistoria('${s.text.replace(/'/g, "\\'")}', '${s.username}', '${encodedUrl}', ${esVideo})"><span style="font-size:20px;">👤</span></div><div class="story-username">@${s.username}</div></div>`; 
        } 
    });
    const scCont = document.getElementById('stories-carousel-container'); if(scCont) scCont.innerHTML = html;
}

// --- SUBIR HISTORIAS CON MULTIMEDIA ---
async function solicitarCrearHistoria() {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = 'image/*,video/*';
    input.onchange = async () => {
        const file = input.files[0]; if(!file) return;
        const texto = prompt("Añade un texto a tu historia (opcional):") || "";
        alert("Subiendo historia...");
        try {
            let fileBlob = file;
            const isVideo = file.type.startsWith('video/');
            if(!isVideo) fileBlob = await comprimirImagen(file);

            const storageRef = ref(storage, 'stories/' + currentUser.uid + '_' + Date.now());
            await uploadBytes(storageRef, fileBlob);
            const mediaUrl = await getDownloadURL(storageRef);

            await addDoc(collection(db, "stories"), { text: texto, uid: currentUser.uid, username: datosMiPerfilGlobal.username, mediaUrl: mediaUrl, isVideo: isVideo, timestamp: serverTimestamp() });
            alert("¡Historia publicada!");
        } catch(e) { alert("Error al subir historia."); }
    };
    input.click();
}

function reproducirHistoria(t, u, encodedUrl, esVideo) {
    terminarVisorHistoria();
    document.getElementById('story-viewer-username').innerText = `@${u}`;
    const mediaUrl = decodeURIComponent(encodedUrl);
    
    let contenidoHtml = '';
    if(mediaUrl) {
        if(esVideo) contenidoHtml = `<video src="${mediaUrl}" autoplay muted playsinline style="max-width:100%; max-height:60vh;"></video>`;
        else contenidoHtml = `<img src="${mediaUrl}" style="max-width:100%; max-height:60vh; border-radius:8px;">`;
    }
    contenidoHtml += `<p style="margin-top:10px; font-size:16px;">${procesarTextoConHashtags(t)}</p>`;
    
    document.getElementById('story-viewer-content').innerHTML = contenidoHtml;
    const v = document.getElementById('story-viewer'); v.classList.remove('hidden');
    const b = document.getElementById('story-progress-bar'); b.style.width = '0%';
    setTimeout(() => { b.style.transition = 'width 5s linear'; b.style.width = '100%'; }, 50);
    temporizadorHistoria = setTimeout(terminarVisorHistoria, 5050);
}
function terminarVisorHistoria() { clearTimeout(temporizadorHistoria); const b = document.getElementById('story-progress-bar'); if(b) { b.style.transition = 'none'; b.style.width = '0%'; } document.getElementById('story-viewer')?.classList.add('hidden'); }

// --- CHAT, INDICADOR Y VISTO ---
async function notificarEscribiendo(isTyping = true) {
    if(!chatUserUidActivo || !currentUser) return;
    const chatId = [currentUser.uid, chatUserUidActivo].sort().join("_");
    await setDoc(doc(db, "chats_status", chatId), { [currentUser.uid]: isTyping, timestamp: serverTimestamp() }, { merge: true });
}

function manejarInputChat() {
    notificarEscribiendo(true); clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => { notificarEscribiendo(false); }, 2000);
}

async function abrirChatCon(tUid, tUser) {
    chatUserUidActivo = tUid; 
    document.getElementById('chat-target-username').innerText = `${tUser}`; 
    document.getElementById('chat-list-view').classList.add('hidden'); 
    document.getElementById('chat-active-view').classList.remove('hidden');
    
    const chatInput = document.getElementById('chat-input-text');
    if(chatInput) { chatInput.removeEventListener('input', manejarInputChat); chatInput.addEventListener('input', manejarInputChat); }
    
    const chatId = [currentUser.uid, tUid].sort().join("_");
    if(desubscribirChatMensajes) desubscribirChatMensajes();
    const box = document.getElementById('chat-messages-container'); box.innerHTML = "Cargando...";
    
    desubscribirChatMensajes = onSnapshot(query(collection(db, "direct_messages"), where("chatId", "==", chatId), orderBy("timestamp", "asc")), (snap) => {
        let h = ""; 
        snap.forEach(d => { 
            const m = d.data(); const mId = d.id;
            // Marcar como leído si lo recibe el usuario actual
            if(m.senderUid !== currentUser.uid && !m.visto) { updateDoc(doc(db, "direct_messages", mId), { visto: true }); }

            const imgHtml = m.imageUrl ? `<img src="${m.imageUrl}" style="max-width:100%; border-radius:8px;">` : '';
            const txtHtml = m.text ? `<span>${m.text}</span>` : '';
            const statusVisto = (m.senderUid === currentUser.uid) ? `<span style="font-size:10px; display:block; text-align:right; opacity:0.6;">${m.visto ? '👁️ Visto' : '✔️ Enviado'}</span>` : '';
            const btnBorrar = m.senderUid === currentUser.uid ? `<div style="font-size:9px; text-align:right; cursor:pointer; color:#ff4a5a; margin-top:3px;" onclick="borrarMensajeChat('${mId}')">🗑️ Borrar</div>` : '';
            
            h += `<div class="chat-bubble ${m.senderUid === currentUser.uid ? 'enviado' : 'recibido'}">${imgHtml}${txtHtml}${statusVisto}${btnBorrar}</div>`; 
        });
        box.innerHTML = h || "<p style='text-align:center; color:var(--texto-gris);'>Di hola 👋</p>"; 
        box.innerHTML += `<div id="dynamic-typing-indicator" style="font-size:12px; color:var(--texto-gris); padding:5px 10px;"></div>`;
        setTimeout(() => { box.scrollTop = box.scrollHeight; }, 100);
    });

    if(desubscribirTyping) desubscribirTyping();
    desubscribirTyping = onSnapshot(doc(db, "chats_status", chatId), (docSnap) => {
        const indicator = document.getElementById('dynamic-typing-indicator');
        if(indicator) {
            const d = docSnap.data();
            indicator.innerText = (d && d[tUid]) ? `${tUser} está escribiendo...` : '';
        }
    });
}
function cerrarChatActivo() { chatUserUidActivo = null; if(desubscribirChatMensajes) desubscribirChatMensajes(); if(desubscribirTyping) desubscribirTyping(); document.getElementById('chat-list-view').classList.remove('hidden'); document.getElementById('chat-active-view').classList.add('hidden'); }

async function enviarMensajePrivado(txt, imgUrl = null) { 
    if(chatUserUidActivo) {
        notificarEscribiendo(false);
        await addDoc(collection(db, "direct_messages"), { chatId: [currentUser.uid, chatUserUidActivo].sort().join("_"), senderUid: currentUser.uid, text: txt, imageUrl: imgUrl, visto: false, timestamp: serverTimestamp() }); 
        await addDoc(collection(db, "notifications"), { toUid: chatUserUidActivo, fromUsername: datosMiPerfilGlobal.username, type: 'message', text: txt ? txt.substring(0,30) : "📷 Archivo", timestamp: serverTimestamp() });
    } 
}

async function enviarFotoEnChat(file) {
    if(!chatUserUidActivo || !currentUser) return;
    try { 
        const imgBlob = await comprimirImagen(file);
        const storageRef = ref(storage, 'chat_images/' + currentUser.uid + '_' + Date.now()); 
        await uploadBytes(storageRef, imgBlob); 
        const url = await getDownloadURL(storageRef); 
        await enviarMensajePrivado("", url); 
    } catch(e) { alert("Error"); }
}
async function borrarMensajeChat(mId) { if(confirm("¿Borrar mensaje?")) await deleteDoc(doc(db, "direct_messages", mId)); }

// --- SOLUCIÓN DEFINITIVA AUDIO LLAMADAS (WEBRTC) ---
async function iniciarLlamada(tipo) {
    if(!chatUserUidActivo) return;
    const isVideo = tipo === 'video';
    document.getElementById('call-overlay').classList.remove('hidden');
    document.getElementById('call-controls-outgoing').classList.remove('hidden');
    document.getElementById('call-user-name').innerText = document.getElementById('chat-target-username').innerText;
    document.getElementById('call-status').innerText = 'Llamando...';
    
    audioDial.play().catch(()=>{});

    try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: isVideo, audio: true });
        document.getElementById('local-video').srcObject = localStream;
        
        peerConnection = new RTCPeerConnection(iceServers);
        localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
        
        peerConnection.ontrack = (event) => {
            audioDial.pause(); audioDial.currentTime = 0;
            // Forzar mapeo tanto al elemento de video como al de audio oculto para asegurar sonido en móviles
            if(document.getElementById('remote-video')) document.getElementById('remote-video').srcObject = event.streams[0];
            remoteAudioNode.srcObject = event.streams[0];
        };

        const callDoc = doc(collection(db, "calls"));
        llamadaActualId = callDoc.id;
        peerConnection.onicecandidate = (e) => { e.candidate && addDoc(collection(callDoc, "offerCandidates"), e.candidate.toJSON()); };

        const offerDescription = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offerDescription);
        await setDoc(callDoc, { offer: { sdp: offerDescription.sdp, type: offerDescription.type }, caller: currentUser.uid, callee: chatUserUidActivo, type: tipo, status: 'calling' });

        unsubscribeLlamadaActiva = onSnapshot(callDoc, (snapshot) => {
            const data = snapshot.data();
            if(!data || data.status === 'ended' || data.status === 'rejected') { finalizarLlamada(); return; }
            if (!peerConnection.currentRemoteDescription && data?.answer) {
                peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
                document.getElementById('call-status').innerText = 'Conectado ⏱️';
            }
        });

        onSnapshot(collection(callDoc, "answerCandidates"), (s) => s.docChanges().forEach(c => c.type === 'added' && peerConnection.addIceCandidate(new RTCIceCandidate(c.doc.data()))));
    } catch (e) { finalizarLlamada(); }
}

function escucharLlamadasEntrantes() {
    if(!currentUser) return;
    if(llamadasEntrantesUnsubscribe) llamadasEntrantesUnsubscribe();
    llamadasEntrantesUnsubscribe = onSnapshot(query(collection(db, "calls"), where("callee", "==", currentUser.uid), where("status", "==", "calling")), (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            if (change.type === 'added') {
                llamadaActualId = change.doc.id;
                document.getElementById('call-overlay').classList.remove('hidden');
                document.getElementById('call-controls-incoming').classList.remove('hidden');
                document.getElementById('call-controls-outgoing').classList.add('hidden');
                document.getElementById('call-status').innerText = 'Llamada entrante...';
                audioRing.play().catch(()=>{});
            }
        });
    });
}

async function responderLlamada() {
    audioRing.pause(); audioRing.currentTime = 0;
    document.getElementById('call-controls-incoming').classList.add('hidden');
    document.getElementById('call-controls-outgoing').classList.remove('hidden');
    
    const callDoc = doc(db, "calls", llamadaActualId);
    const callData = (await getDoc(callDoc)).data();
    
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: callData.type === 'video', audio: true });
        document.getElementById('local-video').srcObject = localStream;
        
        peerConnection = new RTCPeerConnection(iceServers);
        localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
        
        peerConnection.ontrack = (event) => {
            if(document.getElementById('remote-video')) document.getElementById('remote-video').srcObject = event.streams[0];
            remoteAudioNode.srcObject = event.streams[0]; // Audio de entrada
        };

        peerConnection.onicecandidate = (e) => { e.candidate && addDoc(collection(callDoc, "answerCandidates"), e.candidate.toJSON()); };
        await peerConnection.setRemoteDescription(new RTCSessionDescription(callData.offer));
        
        const answerDescription = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answerDescription);
        await updateDoc(callDoc, { answer: { type: answerDescription.type, sdp: answerDescription.sdp }, status: 'answered' });
        
        document.getElementById('call-status').innerText = 'Conectado ⏱️';
        unsubscribeLlamadaActiva = onSnapshot(callDoc, (s) => s.data()?.status === 'ended' && finalizarLlamada());
        onSnapshot(collection(callDoc, "offerCandidates"), (s) => s.docChanges().forEach(c => c.type === 'added' && peerConnection.addIceCandidate(new RTCIceCandidate(c.doc.data()))));
    } catch(e) { finalizarLlamada(); }
}

function finalizarLlamada() {
    audioRing.pause(); audioDial.pause();
    if(peerConnection) peerConnection.close();
    if(localStream) localStream.getTracks().forEach(t => t.stop());
    peerConnection = null; localStream = null;
    if(llamadaActualId) { updateDoc(doc(db, "calls", llamadaActualId), { status: 'ended' }).catch(()=>{}); }
    llamadaActualId = null;
    document.getElementById('call-overlay').classList.add('hidden');
    remoteAudioNode.srcObject = null;
}

function toggleMic() { if(localStream) { const t = localStream.getAudioTracks()[0]; if(t) t.enabled = !t.enabled; } }
function toggleCam() { if(localStream) { const t = localStream.getVideoTracks()[0]; if(t) t.enabled = !t.enabled; } }

// --- CREAR PUBLICACIONES CON IMAGEN O VIDEO AUTOMÁTICO ---
async function crearPublicacion(texto) {
    if (!datosMiPerfilGlobal) return;
    const btn = document.getElementById('btn-publicar-accion'); btn.innerText = "Publicando...";
    const fileInput = document.getElementById('input-post-foto'); const file = fileInput.files[0]; 
    let imgUrl = null; let esVideo = false;
    try {
        if(file) {
            esVideo = file.type.startsWith('video/');
            const fileBlob = esVideo ? file : await comprimirImagen(file); // Comprimir si es imagen
            
            const storageRef = ref(storage, 'posts_images/' + currentUser.uid + '_' + Date.now()); 
            await uploadBytes(storageRef, fileBlob); 
            imgUrl = await getDownloadURL(storageRef); 
        }
        await addDoc(collection(db, "posts"), { text: texto, uid: currentUser.uid, username: datosMiPerfilGlobal.username, imageUrl: imgUrl, isVideo: esVideo, likes: [], comments: [], timestamp: serverTimestamp() });
        document.getElementById('post-text').value = ""; fileInput.value = ""; navegarA('inicio');
    } catch(e) { alert("Error al publicar"); } btn.innerText = "Publicar ahora";
}

// --- RESTO DE PROCESOS LOCALES ---
function setModoBusquedaActiva(modo) { modoBusquedaActual = modo; ejecutarBusquedaLocal(); }
function buscarTagDirecto(tag, event) { if(event) event.stopPropagation(); navegarA('buscar'); setModoBusquedaActiva('tags'); ejecutarBusquedaLocal(); }
function ejecutarBusquedaLocal() {
    const q = document.getElementById('input-busqueda')?.value.toLowerCase().trim() || "";
    const c = document.getElementById('resultados-busqueda'); if(!q || !c) return;
    if(modoBusquedaActual === 'usuarios') {
        const r = usuariosGlobales.filter(u => u.username.toLowerCase().includes(q.replace('@','')) && u.uid !== currentUser.uid);
        c.innerHTML = r.map(generarHtmlUsuario).join('');
    } else {
        c.innerHTML = ''; dibujarPosts(cacheTodosLosPosts.filter(p => p.text.toLowerCase().includes(q)), 'resultados-busqueda');
    }
}
async function toggleSeguirUsuario(uid) {
    const mR = doc(db, "users", currentUser.uid); const oR = doc(db, "users", uid);
    if(datosMiPerfilGlobal.following?.includes(uid)) { await updateDoc(mR, { following: arrayRemove(uid) }); await updateDoc(oR, { followersCount: increment(-1) }); }
    else { await updateDoc(mR, { following: arrayUnion(uid) }); await updateDoc(oR, { followersCount: increment(1) }); }
}
async function darLike(pId, oUid) { const r = doc(db, "posts", pId); const s = await getDoc(r); if(s.data().likes?.includes(currentUser.uid)) { await updateDoc(r, { likes: arrayRemove(currentUser.uid) }); } else { await updateDoc(r, { likes: arrayUnion(currentUser.uid) }); } }
async function comentarPost(pId) { const t = prompt("Tu respuesta:"); if(t?.trim()) await updateDoc(doc(db, "posts", pId), { comments: arrayUnion({ username: datosMiPerfilGlobal.username, text: t.trim() }) }); }
async function borrarComentario(pId, cStr) { if(confirm("¿Borrar?")) await updateDoc(doc(db, "posts", pId), { comments: arrayRemove(JSON.parse(decodeURIComponent(cStr))) }); }
async function eliminarPost(pId) { if(confirm("¿Eliminar?")) await deleteDoc(doc(db, "posts", pId)); }
async function reportarPublicacion(pId) { alert("Reportado."); }
async function bloquearPersona(uid) { await updateDoc(doc(db, "users", currentUser.uid), { blockedUsers: arrayUnion(uid) }); navegarA('inicio'); }
async function hacerRepulse(pId) { alert("Re-pulsado."); }

onAuthStateChanged(auth, (user) => { if(user) { currentUser = user; mostrarMuro(); activarLecturaTiempoReal(); escucharLlamadasEntrantes(); } else { currentUser = null; mostrarLogin(); } });
async function registrarUsuario(e, p, u) { try { const c = await createUserWithEmailAndPassword(auth, e, p); await setDoc(doc(db, "users", c.user.uid), { uid: c.user.uid, username: u.toLowerCase(), followersCount: 0, following: [], blockedUsers: [], bio: "¡Hola!" }); } catch(err) { alert(err.message); } }
async function iniciarSesion(e, p) { try { await signInWithEmailAndPassword(auth, e, p); } catch(e) { alert("Error"); } }
async function cerrarSesion() { await signOut(auth); }

function activarLecturaTiempoReal() {
    desubscribirPosts = onSnapshot(query(collection(db, "posts"), orderBy("timestamp", "desc")), (s) => { cacheTodosLosPosts = s.docs.map(d => ({ id: d.id, ...d.data() })); actualizarMurosYFeed(); });
    desubscribirUsuarios = onSnapshot(collection(db, "users"), (s) => { usuariosGlobales = s.docs.map(d => d.data()); datosMiPerfilGlobal = usuariosGlobales.find(u => u.uid === currentUser.uid) || null; dibujarMiPerfil(); actualizarMurosYFeed(); });
    desubscribirStories = onSnapshot(query(collection(db, "stories"), orderBy("timestamp", "desc")), (s) => dibujarHistoriasBarra(s.docs.map(d => d.data())));
    desubscribirNotif = onSnapshot(query(collection(db, "notifications"), where("toUid", "==", currentUser.uid)), (s) => { notificacionesGlobales = s.docs.map(d => d.data()); dibujarNotificaciones(notificacionesGlobales); });
}

window.registrarUsuario = registrarUsuario; window.iniciarSesion = iniciarSesion; window.cerrarSesion = cerrarSesion; window.crearPublicacion = crearPublicacion; window.toggleSeguirUsuario = toggleSeguirUsuario; window.navegarA = navegarA; window.ejecutarBusquedaLocal = ejecutarBusquedaLocal; window.setModoBusquedaActiva = setModoBusquedaActiva; window.buscarTagDirecto = buscarTagDirecto; window.darLike = darLike; window.comentarPost = comentarPost; window.eliminarPost = eliminarPost; window.reportarPublicacion = reportarPublicacion; window.bloquearPersona = bloquearPersona; window.abrirChatCon = abrirChatCon; window.cerrarChatActivo = cerrarChatActivo; window.enviarMensajePrivado = enviarMensajePrivado; window.enviarFotoEnChat = enviarFotoEnChat; window.borrarMensajeChat = borrarMensajeChat; window.solicitarCrearHistoria = solicitarCrearHistoria; window.reproducirHistoria = reproducirHistoria; window.terminarVisorHistoria = terminarVisorHistoria; window.verPerfilUsuario = verPerfilUsuario; window.subirImagenPerfil = subirImagenPerfil; window.verSeguidores = verSeguidores; window.cerrarModalListaUI = cerrarModalListaUI; window.verSiguiendo = verSiguiendo; window.borrarComentario = borrarComentario; window.hacerRepulse = hacerRepulse; window.iniciarLlamada = iniciarLlamada; window.responderLlamada = responderLlamada; window.finalizarLlamada = finalizarLlamada; window.toggleMic = toggleMic; window.toggleCam = toggleCam; window.notificarEscribiendo = notificarEscribiendo;