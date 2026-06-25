// ==========================================================================
// PLUS NETWORK - SCRIPT CORE (CONSOLIDADO COMPLETO + ADMIN PANEL + PAYPAL)
// ==========================================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, where, doc, updateDoc, arrayUnion, arrayRemove, increment, getDoc, setDoc, serverTimestamp, deleteDoc, getDocs, getCountFromServer } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut, deleteUser, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-storage.js";
import { getMessaging, getToken, onMessage } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-messaging.js";
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
const messaging = getMessaging(app);

// Variables de Estado Global
let currentUser = null; 
let datosMiPerfilGlobal = null;
let usuariosGlobales = [];
let cacheTodosLosPosts = [];
let cacheTodosLosReels = [];
let notificacionesGlobales = [];

// Manejadores de suscripciones en tiempo real
let desubscribirPosts = null, desubscribirReels = null, desubscribirUsuarios = null, desubscribirNotif = null, desubscribirChatMensajes = null, desubscribirStories = null;
let desubscribirTyping = null; 

let chatUserUidActivo = null;
let temporizadorHistoria = null;
let historiaActivaUid = null; 
let perfilAjenoUidActivo = null;
let modoBusquedaActual = 'usuarios';
let observerReels = null;
let typingTimeout = null; 

// Variables WebRTC para Llamadas
let localStream = null;
let remoteStream = null;
let peerConnection = null;
let llamadaActualId = null;
let unsubscribeLlamadaActiva = null;
let llamadasEntrantesUnsubscribe = null;
const iceServers = { iceServers: [{ urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'] }] };

// --- SISTEMA DE INSIGNIAS VISUAL ---
function obtenerInsigniaHtml(user, isTitle = false) {
    if (!user || !user.verified) return '';
    const level = user.badgeLevel || 'purple';

    // 👑 DISEÑO VIP BLACK (MÁS GRANDE Y ALINEADO) 👑
    if (level === 'black') {
        // Tamaños específicos solo para la negra (más grandes)
        const sizeBlack = isTitle ? '28px' : '24px'; 
        
        // margin-left:2px (para acercarla) | top:-2px (para alinearla perfecto a la altura del nombre)
        return `
        <svg class="verified-badge badge-black animate-badge" style="width:${sizeBlack}; height:${sizeBlack}; display:inline-block; vertical-align:middle; position:relative; top:-2px; margin-left:2px;" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" title="Insignia BLACK VIP">
            <g transform="translate(4, 6)">
                <path d="M12 1.5l2.6 2.8 3.9-.5 1.3 3.8 3.8 1.3-.5 3.9 2.8 2.6-2.8 2.6.5 3.9-3.8 1.3-1.3 3.8-3.9-.5-2.6 2.8-2.6-2.8-3.9.5-1.3-3.8-3.8-1.3.5-3.9-2.8-2.6 2.8-2.6-.5-3.9 3.8-1.3 1.3-3.8 3.9.5L12 1.5z" 
                      fill="#000000" stroke="rgba(255,255,255,0.2)" stroke-width="1"/>
                <path d="M10 15.5l-3.5-3.5 1.5-1.5 2 2 6-6 1.5 1.5-7.5 7.5z" fill="#ffffff"/>
            </g>
            <g transform="translate(2, 3) rotate(-22) scale(0.7)">
                <path d="M4 14 L5 3 L10 7 L15 1 L20 7 L25 3 L26 14 Z" 
                      fill="#F1C40F" stroke="#000000" stroke-width="1.5" stroke-linejoin="round"/>
                <path d="M6 12 L24 12" stroke="#000000" stroke-width="1.5"/>
            </g>
        </svg>`;
    }

    // --- DISEÑO ORIGINAL PARA LAS DEMÁS (Azul, Dorada, etc.) ---
    const sizeOriginal = isTitle ? '20px' : '15px'; // Tamaños originales más pequeños
    let badgeClass = `badge-${level}`;
    
    return `
    <svg class="verified-badge ${badgeClass} animate-badge" style="width:${sizeOriginal}; height:${sizeOriginal}; display:inline-block; vertical-align:middle; margin-left:3px;" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 1.5l2.6 2.8 3.9-.5 1.3 3.8 3.8 1.3-.5 3.9 2.8 2.6-2.8 2.6.5 3.9-3.8 1.3-1.3 3.8-3.9-.5-2.6 2.8-2.6-2.8-3.9.5-1.3-3.8-3.8-1.3.5-3.9-2.8-2.6 2.8-2.6-.5-3.9 3.8-1.3 1.3-3.8 3.9.5L12 1.5z"/>
        <path d="M10 15.5l-3.5-3.5 1.5-1.5 2 2 6-6 1.5 1.5-7.5 7.5z" fill="#ffffff"/>
    </svg>`;
}

// --- INYECCIÓN DEL MODAL DE CONFIGURACIÓN ---
function crearModalConfiguracion() {
    if (document.getElementById('modal-configuracion')) return;
    const modal = document.createElement('div');
    modal.id = 'modal-configuracion';
    modal.className = 'hidden';
    modal.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); z-index:4000; display:flex; justify-content:center; align-items:center;';
    modal.innerHTML = `
        <div style="background:#111; width:90%; max-width:400px; border-radius:15px; border: 1px solid rgba(255,255,255,0.1); padding:20px; box-sizing:border-box;">
            <h3 style="margin-top:0; color:#fff; text-align:center; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom:10px;">⚙️ Configuración</h3>
            <button style="width:100%; margin-top:15px; padding:12px; background:transparent; color:#fff; border:1px solid #333; border-radius:10px; text-align:left; font-size:15px; font-weight:bold;" onclick="cerrarConfiguracion(); verBloqueados()">🚫 Usuarios Bloqueados</button>
            <button style="width:100%; margin-top:10px; padding:12px; background:transparent; color:#fff; border:1px solid #333; border-radius:10px; text-align:left; font-size:15px; font-weight:bold;" onclick="cerrarConfiguracion(); solicitarVerificacionCuenta()">✔ Solicitar Insignia Oficial</button>
            <button style="width:100%; margin-top:10px; padding:12px; background:transparent; color:#fff; border:1px solid #333; border-radius:10px; text-align:left; font-size:15px; font-weight:bold;" onclick="cerrarConfiguracion(); cerrarSesion()">🚪 Cerrar Sesión</button>
            <button style="width:100%; margin-top:10px; padding:12px; background:transparent; color:#ff4a5a; border:1px solid #ff4a5a; border-radius:10px; text-align:left; font-size:15px; font-weight:bold;" onclick="cerrarConfiguracion(); eliminarMiCuenta()">🗑️ Eliminar Cuenta</button>
            <button style="width:100%; margin-top:20px; padding:12px; background:#fff; color:#000; border:none; border-radius:20px; font-weight:bold; font-size:16px;" onclick="cerrarConfiguracion()">Cerrar</button>
        </div>
    `;
    document.body.appendChild(modal);
}

function abrirConfiguracion() { document.getElementById('modal-configuracion').classList.remove('hidden'); }
function cerrarConfiguracion() { document.getElementById('modal-configuracion').classList.add('hidden'); }

// --- UTILIDADES ---
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

// --- NAVEGACIÓN Y VISTAS ---
function mostrarMuro() { document.getElementById('auth-screen').classList.add('hidden'); document.getElementById('main-screen').classList.remove('hidden'); navegarA('inicio'); crearModalConfiguracion(); }
function mostrarLogin() {
    document.getElementById('auth-screen').classList.remove('hidden'); document.getElementById('main-screen').classList.add('hidden');
    if(desubscribirPosts) desubscribirPosts(); if(desubscribirUsuarios) desubscribirUsuarios(); if(desubscribirReels) desubscribirReels();
    if(desubscribirNotif) desubscribirNotif(); if(desubscribirStories) desubscribirStories();
    if(llamadasEntrantesUnsubscribe) llamadasEntrantesUnsubscribe();
    cerrarChatActivo(); terminarVisorHistoria(); finalizarLlamada();
    
    datosMiPerfilGlobal = null; usuariosGlobales = []; cacheTodosLosPosts = []; cacheTodosLosReels = []; notificacionesGlobales = [];
    const btnAdmin = document.getElementById('btn-admin-hidden'); if(btnAdmin) btnAdmin.remove();
}

function navegarA(tab) {
    const tabs = ['inicio', 'buscar', 'publicar', 'reels', 'explorar', 'perfil', 'notificaciones', 'mensajes', 'perfil-ajeno'];
    tabs.forEach(t => { document.getElementById(`tab-${t}`)?.classList.add('hidden'); document.getElementById(`btn-tab-${t}`)?.classList.remove('active'); });
    
    document.getElementById(`btn-tab-explorar`)?.classList.remove('active');
    const targetTab = document.getElementById(`tab-${tab}`);
    if (targetTab) targetTab.classList.remove('hidden');
    if (targetTab) { targetTab.style.animation = 'none'; targetTab.offsetHeight; targetTab.style.animation = null; }
    document.getElementById(`btn-tab-${tab}`)?.classList.add('active');
    
    if(tab !== 'reels') document.querySelectorAll('.reel-video').forEach(v => v.pause());
    if(tab === 'notificaciones') { localStorage.setItem('lastCheckedNotif', Date.now().toString()); document.getElementById('badge-notif')?.classList.add('hidden'); }
    if(tab === 'mensajes') { cerrarChatActivo(); localStorage.setItem('lastCheckedMensajes', Date.now().toString()); document.getElementById('badge-mensajes')?.classList.add('hidden'); actualizarMurosYFeed(); }
    if(tab !== 'perfil-ajeno') perfilAjenoUidActivo = null;
}

// --- MULTIMEDIA (POSTS & REELS) ---
async function subirImagenPerfil(file, tipo) {
    if(!currentUser) return;
    const btnId = tipo === 'perfil' ? 'btn-cambiar-foto' : 'btn-cambiar-portada';
    const btn = document.getElementById(btnId);
    const originalText = btn.innerText; btn.innerText = "⏳ Subiendo...";
    try {
        const storageRef = ref(storage, (tipo === 'perfil' ? 'perfiles/' : 'portadas/') + currentUser.uid + '_' + Date.now());
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        await updateDoc(doc(db, "users", currentUser.uid), tipo === 'perfil' ? { profilePic: url } : { coverPic: url });
        btn.innerText = "✅ Listo!"; setTimeout(() => { btn.innerText = originalText; }, 2500);
    } catch(e) { console.error(e); alert("Error."); btn.innerText = originalText; }
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
        const btnReportar = (currentUser && post.uid !== currentUser.uid) ? `<button style="background:none; border:none; color:var(--texto-gris); cursor:pointer; font-size:18px; font-weight:bold; padding: 0 5px;" onclick="reportarPublicacion('${post.id}')" title="Reportar publicación">⋮</button>` : '';

        let comentariosHtml = "";
        if(comments.length > 0) {
            comentariosHtml = `<div class="comment-section">`;
            comments.forEach((c) => { 
                const encodedComment = encodeURIComponent(JSON.stringify(c));
                const puedeBorrarC = (currentUser && (post.uid === currentUser.uid || c.username === datosMiPerfilGlobal?.username));
                const btnBorrarC = puedeBorrarC ? `<button style="background:none; border:none; color:#ff4a5a; font-size:11px; cursor:pointer; padding:0; margin-left:10px;" onclick="borrarComentario('${post.id}', '${encodedComment}')">Borrar</button>` : '';
                
                const autorComentario = usuariosGlobales.find(u => u.username === c.username);
                const insigniaComentarioHtml = obtenerInsigniaHtml(autorComentario);

                comentariosHtml += `<div style="margin-bottom: 5px; display:flex; justify-content:space-between;"><span><b>@${c.username}${insigniaComentarioHtml}:</b> <span style="color: var(--texto-gris);">${c.text}</span></span> ${btnBorrarC}</div>`; 
            });
            comentariosHtml += `</div>`;
        }

        const imagenHtml = post.imageUrl ? `<img src="${post.imageUrl}" class="post-img">` : '';
        const esRepulse = post.isRepulse ? `<div style="font-size: 11px; color: var(--texto-gris); margin-bottom: 8px; font-weight: bold;">🔁 Re-pulsado de @${post.originalAuthor}</div>` : '';

        const autor = usuariosGlobales.find(u => u.uid === post.uid) || { verified: post.verified, badgeLevel: post.badgeLevel };
        const insigniaHtml = obtenerInsigniaHtml(autor);

        html += `
            <div class="custom-card">
                ${esRepulse}
                <div class="card-top">
                    <span style="color: var(--texto-blanco); cursor:pointer;" onclick="verPerfilUsuario('${post.uid}')">@${post.username || "anonimo"} ${insigniaHtml}<span style="color:var(--texto-gris); font-size:11px; font-weight:normal; margin-left:5px;">• ${formatearFecha(post.timestamp)}</span></span>
                    <div><span style="font-size:10px; color:gray; margin-right:5px;">ID: ${post.id}</span>${btnEliminar}${btnReportar}</div>
                </div>
                <p class="card-main-text">${procesarTextoConHashtags(post.text)}</p>
                ${imagenHtml}
                <div class="action-bar">
                    <button class="action-btn ${yaDioLike ? 'liked' : ''}" onclick="darLike('${post.id}', '${post.uid}')">
                        <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="${yaDioLike ? 'currentColor' : 'none'}" style="display:inline-block; vertical-align:middle; transition: fill 0.2s;">
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                        </svg>
                        <span style="vertical-align:middle; margin-left:2px;">${likes.length}</span>
                    </button>
                    <button class="action-btn" onclick="comentarPost('${post.id}')">💬 ${comments.length}</button>
                    <button class="action-btn" onclick="hacerRepulse('${post.id}')" title="Compartir">🔁</button>
                </div>
                ${comentariosHtml}
            </div>`;
    });
    contenedor.innerHTML = html;
}

function dibujarReels(listaDeReels) {
    const wrapper = document.getElementById('reels-feed-wrapper');
    if (!wrapper) return;
    if (listaDeReels.length === 0) { wrapper.innerHTML = '<p style="color:var(--texto-gris); text-align:center; padding: 40px;">No hay videos subidos aún.</p>'; return; }

    const bloqueados = datosMiPerfilGlobal?.blockedUsers || [];
    const reelsLimpios = listaDeReels.filter(r => !bloqueados.includes(r.uid));

    wrapper.innerHTML = reelsLimpios.map(reel => {
        const likes = reel.likes || [];
        const comments = reel.comments || [];
        const yaDioLike = currentUser && likes.includes(currentUser.uid);
        const btnEliminar = (currentUser && reel.uid === currentUser.uid) ? `<button class="reel-action-button" style="color:#ff4a5a; font-size:16px;" onclick="eliminarReel('${reel.id}')" title="Eliminar Reel">🗑️</button>` : '';

        const autor = usuariosGlobales.find(u => u.uid === reel.uid) || { verified: reel.verified, badgeLevel: reel.badgeLevel };
        const insigniaHtml = obtenerInsigniaHtml(autor);

        return `
            <div class="reel-card">
                <video src="${reel.videoUrl}" class="reel-video" loop playsinline controls muted></video>
                <div class="reel-sidebar-actions">
                    <button class="reel-action-button ${yaDioLike ? 'liked' : ''}" onclick="darLikeReel('${reel.id}', '${reel.uid}')">❤️</button>
                    <span class="reel-action-counter">${likes.length}</span>
                    <button class="reel-action-button" onclick="comentarReel('${reel.id}')">💬</button>
                    <span class="reel-action-counter">${comments.length}</span>
                    ${btnEliminar}
                </div>
                <div class="reel-bottom-info">
                    <h3 class="reel-user-tag" onclick="verPerfilUsuario('${reel.uid}')">@${reel.username} ${insigniaHtml}</h3>
                    <p class="reel-description">${procesarTextoConHashtags(reel.text)}</p>
                </div>
            </div>
        `;
    }).join('');
    configurarAutoPlayReels();
}

function configurarAutoPlayReels() {
    if (observerReels) observerReels.disconnect();
    observerReels = new IntersectionObserver((entries) => {
        entries.forEach(entry => { const video = entry.target; if (entry.isIntersecting) video.play().catch(() => {}); else video.pause(); });
    }, { threshold: 0.6 });
    document.querySelectorAll('.reel-video').forEach(video => { observerReels.observe(video); video.addEventListener('click', () => { if (video.muted) video.muted = false; }); });
}

async function crearPublicacion(texto) {
    if (!datosMiPerfilGlobal) return;
    const btn = document.getElementById('btn-publicar-accion'); btn.innerText = "Publicando...";
    const filePhoto = document.getElementById('input-post-foto').files[0]; const fileVideo = document.getElementById('input-post-video').files[0];
    try {
        if (fileVideo) {
            const storageRef = ref(storage, 'reels_videos/' + currentUser.uid + '_' + Date.now()); await uploadBytes(storageRef, fileVideo); const videoUrl = await getDownloadURL(storageRef);
            await addDoc(collection(db, "reels"), { text: texto, uid: currentUser.uid, username: datosMiPerfilGlobal.username, videoUrl: videoUrl, likes: [], comments: [], timestamp: serverTimestamp() });
            document.getElementById('input-post-video').value = ""; document.getElementById('preview-post-video').style.display = 'none'; document.getElementById('post-text').value = ""; navegarA('reels');
        } else {
            let imgUrl = null; if(filePhoto) { const storageRef = ref(storage, 'posts_images/' + currentUser.uid + '_' + Date.now()); await uploadBytes(storageRef, filePhoto); imgUrl = await getDownloadURL(storageRef); }
            await addDoc(collection(db, "posts"), { text: texto, uid: currentUser.uid, username: datosMiPerfilGlobal.username, imageUrl: imgUrl, likes: [], comments: [], timestamp: serverTimestamp() });
            document.getElementById('input-post-foto').value = ""; document.getElementById('preview-post-img').style.display = 'none'; document.getElementById('post-text').value = ""; navegarA('inicio');
        }
    } catch(e) { alert("Error al subir contenido"); } 
    btn.innerText = "Publicar ahora";
}

// --- INTERACCIONES SOCIALES ---
function generarHtmlUsuario(user) {
    const yaLoSigo = datosMiPerfilGlobal?.following?.includes(user.uid);
    const insigniaHtml = obtenerInsigniaHtml(user);
    return `<div class="custom-card" style="display:flex; justify-content:space-between; align-items:center;">
            <div style="cursor:pointer;" onclick="verPerfilUsuario('${user.uid}')">
                <span style="font-weight:bold; color:var(--texto-blanco);">@${user.username} ${insigniaHtml}</span><br>
                <small style="color:var(--texto-gris); font-size:10px;">ID: ${user.uid}</small><br>
                <small style="color:var(--texto-gris);">${user.bio || 'Nuevo en plus.'}</small>
            </div>
            <button class="btn-follow-action ${yaLoSigo ? 'following' : ''}" onclick="toggleSeguirUsuario('${user.uid}')">${yaLoSigo ? 'Siguiendo' : 'Seguir'}</button>
        </div>`;
}

function verSeguidores(targetUid) { const seguidores = usuariosGlobales.filter(u => u.following && u.following.includes(targetUid)); document.getElementById('modal-lista-titulo').innerText = 'Seguidores'; document.getElementById('modal-lista-contenido').innerHTML = seguidores.length ? seguidores.map(generarHtmlUsuario).join('') : "<p style='text-align:center;'>Sin seguidores.</p>"; document.getElementById('modal-lista-usuarios').classList.remove('hidden'); }
function verSiguiendo(targetUid) { const t = usuariosGlobales.find(u => u.uid === targetUid) || (targetUid === currentUser.uid ? datosMiPerfilGlobal : null); const list = t?.following || []; const seguidos = usuariosGlobales.filter(u => list.includes(u.uid)); document.getElementById('modal-lista-titulo').innerText = 'Siguiendo'; document.getElementById('modal-lista-contenido').innerHTML = seguidos.length ? seguidos.map(generarHtmlUsuario).join('') : "<p style='text-align:center;'>No sigue a nadie.</p>"; document.getElementById('modal-lista-usuarios').classList.remove('hidden'); }
function cerrarModalListaUI() { document.getElementById('modal-lista-usuarios').classList.add('hidden'); }

function verBloqueados() {
    const bloqueados = datosMiPerfilGlobal?.blockedUsers || [];
    const lista = usuariosGlobales.filter(u => bloqueados.includes(u.uid));
    document.getElementById('modal-lista-titulo').innerText = 'Usuarios Bloqueados';
    document.getElementById('modal-lista-contenido').innerHTML = lista.length ? lista.map(u => {
        return `<div class="custom-card" style="display:flex; justify-content:space-between; align-items:center;">
            <div><span style="font-weight:bold; color:var(--texto-blanco);">@${u.username}</span></div>
            <button class="btn-plus-sec" style="border-color:#4CAF50; color:#4CAF50; padding: 5px 15px; border-radius: 15px;" onclick="desbloquearPersona('${u.uid}')">Desbloquear</button>
        </div>`;
    }).join('') : "<p style='text-align:center; color:var(--texto-gris);'>No tienes usuarios bloqueados.</p>";
    document.getElementById('modal-lista-usuarios').classList.remove('hidden');
}

function actualizarMurosYFeed() {
    if (!datosMiPerfilGlobal || cacheTodosLosPosts.length === 0) { dibujarPosts([], 'feed-container'); return; }
    const bloqueados = datosMiPerfilGlobal.blockedUsers || [];
    const postsLimpios = cacheTodosLosPosts.filter(p => !bloqueados.includes(p.uid));
    const misSiguiendo = datosMiPerfilGlobal.following || [];
    dibujarPosts(postsLimpios.filter(p => p.uid === currentUser.uid || misSiguiendo.includes(p.uid)), 'feed-container');
    dibujarTendencias(postsLimpios); 
    if (perfilAjenoUidActivo) actualizarVistaPerfilAjeno(postsLimpios);
    const otrosLimpios = usuariosGlobales.filter(u => u.uid !== currentUser.uid && !bloqueados.includes(u.uid));
    const containerUsers = document.getElementById('users-container');
    if(containerUsers) containerUsers.innerHTML = otrosLimpios.length ? otrosLimpios.map(generarHtmlUsuario).join('') : '<p>Sin recomendaciones.</p>';
    dibujarListaContactosChat(otrosLimpios);
}

function dibujarTendencias(postsLimpios) {
    const pops = [...postsLimpios].sort((a, b) => (b.likes?.length || 0) - (a.likes?.length || 0)).slice(0, 3);
    const containerTrend = document.getElementById('trending-container');
    if(containerTrend) containerTrend.innerHTML = pops.length ? pops.map((post, i) => `<div class="custom-card" onclick="verPerfilUsuario('${post.uid}')"><div class="card-top"><span>#${i + 1} Tendencia</span></div><p style="margin:5px 0;">${procesarTextoConHashtags(post.text)}</p></div>`).join('') : "<p>No hay tendencias.</p>";
}

// --- LISTA CONTACTOS Y PERFILES ---
function dibujarListaContactosChat(lista) { 
    if(!currentUser || !document.getElementById('chat-users-list')) return;
    let contactos = lista.map(u => {
        const msgs = notificacionesGlobales.filter(n => n.type === 'message' && n.fromUsername === u.username);
        const lastMsg = msgs.sort((a,b) => (b.timestamp?.toMillis()||0) - (a.timestamp?.toMillis()||0))[0];
        return { ...u, lastMsg };
    });
    contactos.sort((a, b) => { const timeA = a.lastMsg ? (a.lastMsg.timestamp?.toMillis()||0) : 0; const timeB = b.lastMsg ? (b.lastMsg.timestamp?.toMillis()||0) : 0; return timeB - timeA; });

    document.getElementById('chat-users-list').innerHTML = contactos.map(u => {
        const avatarHtml = u.profilePic ? `<img src="${u.profilePic}" style="width:100%; height:100%; object-fit:cover;">` : `👤`;
        let prevText = "Toca para enviar mensaje..."; let unreadDot = "";
        if (u.lastMsg) {
            prevText = u.lastMsg.text || "📷 Foto";
            const lastCheckedMensajes = parseInt(localStorage.getItem('lastCheckedMensajes') || "0");
            if (u.lastMsg.timestamp && u.lastMsg.timestamp.toMillis() > lastCheckedMensajes) {
                unreadDot = `<span style="background:#ff4a5a; width:10px; height:10px; border-radius:50%; display:inline-block; margin-left:5px;"></span>`;
                prevText = `<span style="color:var(--texto-blanco); font-weight:bold;">${prevText}</span>`;
            }
        }
        const insigniaHtml = obtenerInsigniaHtml(u);
        return `
        <div class="chat-list-item" onclick="abrirChatCon('${u.uid}', '${u.username}')">
            <div class="chat-list-avatar">${avatarHtml}</div>
            <div class="chat-list-info">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <p class="chat-list-name">${u.username} ${insigniaHtml}</p>
                    ${unreadDot}
                </div>
                <p class="chat-list-preview" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 230px;">${prevText}</p>
            </div>
        </div>`;
    }).join(''); 
}

function renderHeaderPerfil(user, isMe) {
    const avatarHtml = user.profilePic ? `<img src="${user.profilePic}">` : `<svg viewBox="0 0 24 24" width="40" height="40" stroke="currentColor" stroke-width="2" fill="none"><circle cx="12" cy="7" r="4"></circle><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path></svg>`;
    const bannerHtml = user.coverPic ? `<img src="${user.coverPic}" class="cover-photo">` : `<div class="cover-photo"></div>`;
    const yaLoSigo = datosMiPerfilGlobal?.following?.includes(user.uid);
    const estaBloqueado = datosMiPerfilGlobal?.blockedUsers?.includes(user.uid);

    const btnSeguirHtml = !isMe ? `<button class="btn-plus ${yaLoSigo ? 'btn-plus-sec' : ''}" style="width:auto; padding:8px 20px; border-radius:20px; margin-top:10px;" onclick="toggleSeguirUsuario('${user.uid}')">${yaLoSigo ? 'Siguiendo' : 'Seguir'}</button>` : '';
    const btnMensajeHtml = (!isMe && yaLoSigo) ? `<button class="btn-plus-sec" style="width:auto; padding:8px 20px; border-radius:20px; margin-top:10px; margin-left:8px;" onclick="abrirChatCon('${user.uid}', '${user.username}')">💬 Mensaje</button>` : '';
    const btnBloquearHtml = (!isMe) ? ( estaBloqueado ? `<button class="btn-plus-sec" style="width:auto; padding:8px 15px; border-radius:20px; margin-top:10px; margin-left:8px; border-color: #4CAF50; color: #4CAF50;" onclick="desbloquearPersona('${user.uid}')" title="Desbloquear Usuario">✅ Desbloquear</button>` : `<button class="btn-plus-sec" style="width:auto; padding:8px 15px; border-radius:20px; margin-top:10px; margin-left:8px; border-color: #ff4a5a; color: #ff4a5a;" onclick="bloquearPersona('${user.uid}')" title="Bloquear Usuario">🚫 Bloquear</button>` ) : '';
    const btnConfiguracion = isMe ? `<button class="btn-plus-sec" style="width:auto; padding:8px 15px; border-radius:20px; margin-top:10px; margin-left:8px; border-color: var(--texto-gris); color: var(--texto-blanco);" onclick="abrirConfiguracion()">⚙️ Configuración</button>` : '';

    const insigniaHtml = obtenerInsigniaHtml(user, true);

    return `
        <div class="profile-card-header">
            ${bannerHtml}
            <div class="avatar-circle overlap">${avatarHtml}</div>
            <div class="profile-info">
                <h2 style="margin:5px 0; font-size:24px; display:flex; align-items:center; justify-content:center; gap:5px;">
                    @${user.username} ${insigniaHtml}
                </h2>
                <p style="color:var(--texto-blanco); font-size:15px;">${procesarTextoConHashtags(user.bio || 'Sin biografía')}</p>
                <div style="display:flex; justify-content:center; flex-wrap:wrap;">${btnSeguirHtml} ${btnMensajeHtml} ${btnBloquearHtml} ${btnConfiguracion}</div>
            </div>
        </div>
        <div class="stats-row">
            <div class="stat-box" onclick="verSeguidores('${user.uid}')"><span>${user.followersCount || 0}</span><label>Seguidores</label></div>
            <div class="stat-box" onclick="verSiguiendo('${user.uid}')"><span>${user.following?.length || 0}</span><label>Siguiendo</label></div>
        </div>
    `;
}

function dibujarMiPerfil() { if(datosMiPerfilGlobal && document.getElementById('profile-container')) document.getElementById('profile-container').innerHTML = renderHeaderPerfil(datosMiPerfilGlobal, true); }

function actualizarVistaPerfilAjeno(postsLimpios = null) {
    if(!perfilAjenoUidActivo || !document.getElementById('user-profile-container')) return; 
    const u = usuariosGlobales.find(x => x.uid === perfilAjenoUidActivo);
    if(u) { document.getElementById('user-profile-container').innerHTML = renderHeaderPerfil(u, false); const posts = postsLimpios || cacheTodosLosPosts; dibujarPosts(posts.filter(p => p.uid === u.uid), 'user-feed-container'); }
}

function verPerfilUsuario(uid) { if(currentUser && uid === currentUser.uid) navegarA('perfil'); else { perfilAjenoUidActivo = uid; navegarA('perfil-ajeno'); actualizarMurosYFeed(); } }

// --- NOTIFICACIONES ---
function dibujarNotificaciones(lista) {
    const containerNotif = document.getElementById('notifications-container');
    if(!containerNotif) return;
    const bloqueados = datosMiPerfilGlobal?.blockedUsers || [];
    const listaLimpia = lista.filter(n => { const remitente = usuariosGlobales.find(u => u.username === n.fromUsername); return !remitente || !bloqueados.includes(remitente.uid); });

    containerNotif.innerHTML = listaLimpia.length ? listaLimpia.sort((a, b) => (b.timestamp?.toMillis() || 0) - (a.timestamp?.toMillis() || 0)).map(n => {
        let icono = '👾'; let accion = 'te sigue';
        if(n.type === 'like') { icono = '🚀'; accion = 'le gustó tu pulso'; }
        if(n.type === 'repulse') { icono = '🔁'; accion = 're-pulsó tu publicación'; }
        if(n.type === 'message') { icono = '💬'; accion = 'te envió un mensaje'; }
        return `<div class="notif-item"><p class="notif-text">${icono} ${n.fromUsername} ${accion}</p><p class="notif-time">${formatearFecha(n.timestamp)}</p></div>`;
    }).join('') : '<p style="text-align:center; padding: 20px; color: var(--texto-gris);">Sin actividad reciente.</p>';
}

// --- HISTORIAS ---
function dibujarHistoriasBarra(lista) {
    const containerStories = document.getElementById('stories-carousel-container');
    if(!containerStories) return;
    
    const miInsigniaHtml = obtenerInsigniaHtml(datosMiPerfilGlobal);
    let html = `<div><div class="story-circle create" onclick="solicitarCrearHistoria()">＋</div><div class="story-username">Tú ${miInsigniaHtml}</div></div>`;
    
    const limite = Date.now() - 86400000; const vistos = []; const bloqueados = datosMiPerfilGlobal?.blockedUsers || [];
    lista.filter(s => (s.timestamp?.toMillis() || Date.now()) > limite && !bloqueados.includes(s.uid)).forEach(s => { 
        if(!vistos.includes(s.uid)) { 
            vistos.push(s.uid); 
            const autorStory = usuariosGlobales.find(u => u.uid === s.uid);
            const insigniaStoryHtml = obtenerInsigniaHtml(autorStory);
            html += `<div><div class="story-circle" onclick="reproducirHistoria('${s.text.replace(/'/g, "\\'")}', '${s.username}', '${s.uid}')"><span style="font-size:20px;">👤</span></div><div class="story-username" onclick="verPerfilUsuario('${s.uid}')">@${s.username} ${insigniaStoryHtml}</div></div>`; 
        } 
    });
    containerStories.innerHTML = html;
}

async function crearNuevaHistoria(texto) { try { await addDoc(collection(db, "stories"), { text: texto, uid: currentUser.uid, username: datosMiPerfilGlobal.username, timestamp: serverTimestamp() }); } catch(e) {} }

function reproducirHistoria(t, u, uid) { 
    terminarVisorHistoria(); historiaActivaUid = uid; 
    const autorStoryActivo = usuariosGlobales.find(x => x.uid === uid);
    const insigniaViewerHtml = obtenerInsigniaHtml(autorStoryActivo, true);
    document.getElementById('story-viewer-username').innerHTML = `@${u} ${insigniaViewerHtml}`; 
    document.getElementById('story-viewer-content').innerHTML = procesarTextoConHashtags(t); 
    let v = document.getElementById('story-viewer'); let replyBox = document.getElementById('story-reply-box');
    
    if(uid !== currentUser?.uid) {
        if(!replyBox) {
            replyBox = document.createElement('div'); replyBox.id = 'story-reply-box';
            replyBox.style.cssText = 'position:absolute; bottom:30px; left:5%; width:90%; display:flex; gap:10px; z-index:1000; box-sizing:border-box;';
            replyBox.innerHTML = `<input type="text" id="story-reply-input" autocomplete="off" placeholder="Responder a @${u}..." style="flex:1; border-radius:20px; padding:12px 15px; border:1px solid rgba(255,255,255,0.3); background:rgba(0,0,0,0.5); color:#fff; outline:none; backdrop-filter:blur(5px); font-size:14px;">
                <button onclick="enviarRespuestaHistoria()" style="background:#ff4a5a; color:#fff; border:none; border-radius:50%; width:44px; height:44px; cursor:pointer; font-size:18px; display:flex; align-items:center; justify-content:center;">➤</button>`;
            v.appendChild(replyBox);
        } else { replyBox.style.display = 'flex'; document.getElementById('story-reply-input').placeholder = `Responder a @${u}...`; }
        const inputReply = document.getElementById('story-reply-input'); inputReply.value = ""; inputReply.onfocus = () => { clearTimeout(temporizadorHistoria); };
    } else if (replyBox) replyBox.style.display = 'none';

    const b = document.getElementById('story-progress-bar'); v.classList.remove('hidden'); b.style.width = '0%'; 
    setTimeout(() => { b.style.transition = 'width 4s linear'; b.style.width = '100%'; }, 50); 
    temporizadorHistoria = setTimeout(terminarVisorHistoria, 4050); 
}

function terminarVisorHistoria() { clearTimeout(temporizadorHistoria); const b = document.getElementById('story-progress-bar'); if(b) { b.style.transition = 'none'; b.style.width = '0%'; } document.getElementById('story-viewer')?.classList.add('hidden'); }

async function enviarRespuestaHistoria() {
    const input = document.getElementById('story-reply-input'); const txt = input.value.trim();
    if(!txt || !historiaActivaUid || !currentUser) return;
    const chatId = [currentUser.uid, historiaActivaUid].sort().join("_"); const mensajeCompleto = `[Respuesta a historia]: ${txt}`;
    await addDoc(collection(db, "direct_messages"), { chatId: chatId, senderUid: currentUser.uid, text: mensajeCompleto, imageUrl: null, timestamp: serverTimestamp(), status: 'sent' });
    await addDoc(collection(db, "notifications"), { toUid: historiaActivaUid, fromUsername: datosMiPerfilGlobal.username, type: 'message', text: txt.substring(0, 30), timestamp: serverTimestamp() });
    input.value = ""; terminarVisorHistoria(); alert("Respuesta enviada");
}

// --- CHAT EN TIEMPO REAL ---
async function manejarInputChat() {
    if(!chatUserUidActivo || !currentUser) return;
    const chatId = [currentUser.uid, chatUserUidActivo].sort().join("_"); const docRef = doc(db, "chats_meta", chatId);
    if (!typingTimeout) setDoc(docRef, { [`typing_${currentUser.uid}`]: true }, { merge: true }).catch(()=>{});
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => { setDoc(docRef, { [`typing_${currentUser.uid}`]: false }, { merge: true }).catch(()=>{}); typingTimeout = null; }, 1500);
}

async function abrirChatCon(tUid, tUser) {
    chatUserUidActivo = tUid;
    
    const targetUserObj = usuariosGlobales.find(u => u.uid === tUid);
    const insigniaHtml = targetUserObj ? obtenerInsigniaHtml(targetUserObj, true) : '';
    
    document.getElementById('chat-target-username').innerHTML = `${tUser} ${insigniaHtml}`; 
    document.getElementById('chat-active-avatar').innerHTML = (targetUserObj && targetUserObj.profilePic) ? `<img src="${targetUserObj.profilePic}" style="width:100%; height:100%; object-fit:cover;">` : `👤`;
    document.getElementById('chat-list-view').classList.add('hidden'); document.getElementById('chat-active-view').classList.remove('hidden');
    const chatId = [currentUser.uid, tUid].sort().join("_");
    
    if(desubscribirChatMensajes) desubscribirChatMensajes();
    const box = document.getElementById('chat-messages-container'); box.innerHTML = "Cargando...";
    desubscribirChatMensajes = onSnapshot(query(collection(db, "direct_messages"), where("chatId", "==", chatId), orderBy("timestamp", "asc")), (snap) => {
        let h = ""; snap.forEach(d => { 
            const m = d.data(); const mId = d.id; const imgHtml = m.imageUrl ? `<img src="${m.imageUrl}" style="max-width: 100%; border-radius: 10px;">` : '';
            let textDisplay = m.text || ''; if(textDisplay.startsWith('[Respuesta a historia]: ')) textDisplay = `<div style="font-size:11px; color:#ff4a5a; margin-bottom:2px; font-weight:bold;">Respondió a tu historia</div>` + textDisplay.replace('[Respuesta a historia]: ', '');
            const txtHtml = textDisplay ? `<span>${textDisplay}</span>` : '';
            const btnBorrar = m.senderUid === currentUser.uid ? `<div style="font-size:10px; text-align:right; cursor:pointer; opacity:0.6; margin-top:4px;" onclick="borrarMensajeChat('${mId}')">Borrar</div>` : '';
            
            let statusHtml = '';
            if (m.senderUid === currentUser.uid) {
                if (m.status === 'read') {
                    statusHtml = '<span style="color:#4CAF50; font-size:11px; display:block; text-align:right; margin-top:3px; letter-spacing: -2px;">✓✓</span>';
                } else {
                    statusHtml = '<span style="color:var(--texto-gris); font-size:11px; display:block; text-align:right; margin-top:3px;">✓</span>';
                }
            } else if (m.status !== 'read') {
                updateDoc(doc(db, "direct_messages", mId), { status: 'read' }).catch(()=>{});
            }

            h += `<div class="chat-bubble ${m.senderUid === currentUser.uid ? 'enviado' : 'recibido'}">${imgHtml}${txtHtml}${btnBorrar}${statusHtml}</div>`; 
        });
        box.innerHTML = h || "<p style='text-align:center; color:var(--texto-gris); margin-top:20px;'>Di hola 👋</p>"; setTimeout(() => { box.scrollTop = box.scrollHeight; }, 100);
    });

    if(desubscribirTyping) desubscribirTyping();
    desubscribirTyping = onSnapshot(doc(db, "chats_meta", chatId), (docSnap) => {
        const titleEl = document.getElementById('chat-target-username');
        if (docSnap.exists() && docSnap.data()[`typing_${tUid}`]) { 
            titleEl.innerHTML = `${tUser} ${insigniaHtml} <span style="font-size:12px;">(Escribiendo...)</span>`; 
            titleEl.style.color = "#ff4a5a";
        } 
        else { 
            titleEl.innerHTML = `${tUser} ${insigniaHtml}`; 
            titleEl.style.color = "var(--texto-blanco)";
        }
    });
}

function cerrarChatActivo() { 
    if(chatUserUidActivo && currentUser) { const chatId = [currentUser.uid, chatUserUidActivo].sort().join("_"); setDoc(doc(db, "chats_meta", chatId), { [`typing_${currentUser.uid}`]: false }, { merge: true }).catch(()=>{}); }
    chatUserUidActivo = null; if(desubscribirChatMensajes) desubscribirChatMensajes(); if(desubscribirTyping) desubscribirTyping();
    document.getElementById('chat-list-view')?.classList.remove('hidden'); document.getElementById('chat-active-view')?.classList.add('hidden'); 
}

async function enviarMensajePrivado(txt, imgUrl = null) { 
    if(chatUserUidActivo) {
        const chatId = [currentUser.uid, chatUserUidActivo].sort().join("_");
        await addDoc(collection(db, "direct_messages"), { chatId: chatId, senderUid: currentUser.uid, text: txt, imageUrl: imgUrl, timestamp: serverTimestamp(), status: 'sent' }); 
        const previewTxt = txt ? txt.substring(0, 30) : "📷 Foto";
        await addDoc(collection(db, "notifications"), { toUid: chatUserUidActivo, fromUsername: datosMiPerfilGlobal.username, type: 'message', text: previewTxt, timestamp: serverTimestamp() });
        clearTimeout(typingTimeout); typingTimeout = null; setDoc(doc(db, "chats_meta", chatId), { [`typing_${currentUser.uid}`]: false }, { merge: true }).catch(()=>{});
    } 
}

async function enviarFotoEnChat(file) {
    if(!chatUserUidActivo || !currentUser) return;
    const inputPill = document.getElementById('chat-input-text'); const oldPill = inputPill.placeholder; inputPill.placeholder = "Enviando foto...";
    try { const storageRef = ref(storage, 'chat_images/' + currentUser.uid + '_' + Date.now()); await uploadBytes(storageRef, file); const url = await getDownloadURL(storageRef); await enviarMensajePrivado("", url); } catch(e) { alert("Error al subir foto"); }
    inputPill.placeholder = oldPill; document.getElementById('chat-input-foto').value = "";
}

async function borrarMensajeChat(mId) { if(confirm("¿Borrar mensaje para todos?")) await deleteDoc(doc(db, "direct_messages", mId)); }

// --- WEBRTC LLAMADAS (VOZ / VIDEO) ---
async function iniciarLlamada(tipo) {
    if(!chatUserUidActivo) return; const isVideo = tipo === 'video';
    document.getElementById('call-overlay').classList.remove('hidden'); document.getElementById('call-controls-incoming').classList.add('hidden'); document.getElementById('call-controls-outgoing').classList.remove('hidden');
    document.getElementById('call-user-name').innerText = document.getElementById('chat-target-username').innerText.replace(' (Escribiendo...)',''); document.getElementById('call-status').innerText = 'Llamando...';
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: isVideo, audio: true }); remoteStream = new MediaStream();
        document.getElementById('local-video').srcObject = localStream; document.getElementById('remote-video').srcObject = remoteStream;
        peerConnection = new RTCPeerConnection(iceServers); localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
        peerConnection.ontrack = (event) => { event.streams[0].getTracks().forEach(track => remoteStream.addTrack(track)); };
        const callDoc = doc(collection(db, "calls")); llamadaActualId = callDoc.id;
        const offerCandidates = collection(callDoc, "offerCandidates"); const answerCandidates = collection(callDoc, "answerCandidates");
        peerConnection.onicecandidate = (event) => { event.candidate && addDoc(offerCandidates, event.candidate.toJSON()); };
        const offerDescription = await peerConnection.createOffer(); await peerConnection.setLocalDescription(offerDescription);
        await setDoc(callDoc, { offer: { sdp: offerDescription.sdp, type: offerDescription.type }, caller: currentUser.uid, callee: chatUserUidActivo, type: tipo, status: 'calling' });
        unsubscribeLlamadaActiva = onSnapshot(callDoc, (snapshot) => { const data = snapshot.data(); if(!data || data.status === 'ended' || data.status === 'rejected') { finalizarLlamada(); return; }
            if (!peerConnection.currentRemoteDescription && data?.answer) { peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer)); document.getElementById('call-status').innerText = 'Conectado ⏱️'; }
        });
        onSnapshot(answerCandidates, (snapshot) => { snapshot.docChanges().forEach((change) => { if (change.type === 'added') peerConnection.addIceCandidate(new RTCIceCandidate(change.doc.data())); }); });
    } catch (e) { alert("Faltan permisos."); finalizarLlamada(); }
}

function escucharLlamadasEntrantes() {
    if(!currentUser) return; if(llamadasEntrantesUnsubscribe) llamadasEntrantesUnsubscribe();
    llamadasEntrantesUnsubscribe = onSnapshot(query(collection(db, "calls"), where("callee", "==", currentUser.uid), where("status", "==", "calling")), (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            if (change.type === 'added') {
                const callData = change.doc.data(); llamadaActualId = change.doc.id;
                document.getElementById('call-overlay').classList.remove('hidden'); document.getElementById('call-controls-incoming').classList.remove('hidden'); document.getElementById('call-controls-outgoing').classList.add('hidden');
                const callerObj = usuariosGlobales.find(u => u.uid === callData.caller); document.getElementById('call-user-name').innerText = callerObj ? callerObj.username : 'Usuario';
                document.getElementById('call-status').innerText = callData.type === 'video' ? 'Videollamada entrante...' : 'Llamada de voz entrante...';
            }
        });
    });
}

async function responderLlamada() {
    document.getElementById('call-controls-incoming').classList.add('hidden'); document.getElementById('call-controls-outgoing').classList.remove('hidden'); document.getElementById('call-status').innerText = 'Conectando...';
    const callDoc = doc(db, "calls", llamadaActualId); const callData = (await getDoc(callDoc)).data(); const isVideo = callData.type === 'video';
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: isVideo, audio: true }); remoteStream = new MediaStream();
        document.getElementById('local-video').srcObject = localStream; document.getElementById('remote-video').srcObject = remoteStream;
        peerConnection = new RTCPeerConnection(iceServers); localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
        peerConnection.ontrack = (event) => { event.streams[0].getTracks().forEach(track => remoteStream.addTrack(track)); };
        const offerCandidates = collection(callDoc, "offerCandidates"); const answerCandidates = collection(callDoc, "answerCandidates");
        peerConnection.onicecandidate = (event) => { event.candidate && addDoc(answerCandidates, event.candidate.toJSON()); };
        await peerConnection.setRemoteDescription(new RTCSessionDescription(callData.offer)); const answerDescription = await peerConnection.createAnswer(); await peerConnection.setLocalDescription(answerDescription);
        await updateDoc(callDoc, { answer: { type: answerDescription.type, sdp: answerDescription.sdp }, status: 'answered' }); document.getElementById('call-status').innerText = 'Conectado ⏱️';
        unsubscribeLlamadaActiva = onSnapshot(callDoc, (snapshot) => { if(!snapshot.exists() || snapshot.data().status === 'ended') finalizarLlamada(); });
        onSnapshot(offerCandidates, (snapshot) => { snapshot.docChanges().forEach((change) => { if (change.type === 'added') peerConnection.addIceCandidate(new RTCIceCandidate(change.doc.data())); }); });
    } catch(e) { finalizarLlamada(); }
}

async function finalizarLlamada() {
    if(peerConnection) peerConnection.close(); if(localStream) localStream.getTracks().forEach(track => track.stop()); if(remoteStream) remoteStream.getTracks().forEach(track => track.stop());
    peerConnection = null; localStream = null; remoteStream = null;
    if(llamadaActualId) { try { await updateDoc(doc(db, "calls", llamadaActualId), { status: 'ended' }); } catch(e) {} }
    llamadaActualId = null; if(unsubscribeLlamadaActiva) unsubscribeLlamadaActiva(); document.getElementById('call-overlay').classList.add('hidden'); document.getElementById('local-video').srcObject = null; document.getElementById('remote-video').srcObject = null;
}

function toggleMic() { if(!localStream) return; const t = localStream.getAudioTracks()[0]; if(t) { t.enabled = !t.enabled; document.getElementById('btn-mic').style.background = t.enabled ? 'rgba(51, 51, 51, 0.8)' : '#ff4a5a'; } }
function toggleCam() { if(!localStream) return; const t = localStream.getVideoTracks()[0]; if(t) { t.enabled = !t.enabled; document.getElementById('btn-cam').style.background = t.enabled ? 'rgba(51, 51, 51, 0.8)' : '#ff4a5a'; } }

// --- ACCIONES REELS ---
async function darLikeReel(rId, oUid) { const docRef = doc(db, "reels", rId); const data = (await getDoc(docRef)).data(); if(data.likes?.includes(currentUser.uid)) { await updateDoc(docRef, { likes: arrayRemove(currentUser.uid) }); } else { await updateDoc(docRef, { likes: arrayUnion(currentUser.uid) }); if(oUid !== currentUser.uid) await addDoc(collection(db, "notifications"), { toUid: oUid, fromUsername: datosMiPerfilGlobal.username, type: 'like', timestamp: serverTimestamp() }); } }
async function comentarReel(rId) { const t = prompt("Comenta este video:"); if(t?.trim()) await updateDoc(doc(db, "reels", rId), { comments: arrayUnion({ username: datosMiPerfilGlobal.username, text: t.trim() }) }); }
async function eliminarReel(rId) { if(confirm("¿Seguro que deseas eliminar permanentemente este Reel?")) await deleteDoc(doc(db, "reels", rId)); }

// --- MOTOR DE BÚSQUEDA LOCAL ---
function setModoBusquedaActiva(modo) { modoBusquedaActual = modo; document.getElementById('btn-busq-usuarios').className = modo === 'usuarios' ? 'btn-plus' : 'btn-plus-sec'; document.getElementById('btn-busq-tags').className = modo === 'tags' ? 'btn-plus' : 'btn-plus-sec'; const inp = document.getElementById('input-busqueda'); if(inp) inp.placeholder = modo === 'usuarios' ? "Escribe un usuario..." : "Escribe un #hashtag..."; ejecutarBusquedaLocal(); }
function buscarTagDirecto(tag, event) { if(event) event.stopPropagation(); navegarA('buscar'); setModoBusquedaActiva('tags'); document.getElementById('input-busqueda').value = '#' + tag; ejecutarBusquedaLocal(); }

function ejecutarBusquedaLocal() {
    const inputB = document.getElementById('input-busqueda'); if(!inputB) return;
    const q = inputB.value.toLowerCase().trim(); const c = document.getElementById('resultados-busqueda');
    if(!q) { c.innerHTML = "<p style='color:var(--texto-gris);'>Escribe algo para buscar...</p>"; return; }
    const bloqueados = datosMiPerfilGlobal?.blockedUsers || [];
    if (modoBusquedaActual === 'usuarios') {
        const r = usuariosGlobales.filter(u => u.username.toLowerCase().includes(q.replace('@','')) && u.uid !== currentUser.uid && !bloqueados.includes(u.uid));
        c.innerHTML = r.length ? r.map(generarHtmlUsuario).join('') : "<p>Usuarios no encontrados.</p>";
    } else { const tagBuscar = q.startsWith('#') ? q : '#' + q; const r = cacheTodosLosPosts.filter(p => !bloqueados.includes(p.uid) && p.text.toLowerCase().includes(tagBuscar)); dibujarPosts(r, 'resultados-busqueda'); }
}

// --- MODERACIÓN Y SEGURIDAD ---
async function bloquearPersona(uid) { if(confirm("¿Bloquear usuario? Ya no podrán ver tu perfil ni interactuar contigo.")) { await updateDoc(doc(db, "users", currentUser.uid), { blockedUsers: arrayUnion(uid) }); alert("Usuario bloqueado."); navegarA('inicio'); } }
async function desbloquearPersona(uid) { if(confirm("¿Desbloquear a este usuario?")) { await updateDoc(doc(db, "users", currentUser.uid), { blockedUsers: arrayRemove(uid) }); alert("Usuario desbloqueado."); actualizarMurosYFeed(); cerrarModalListaUI(); } }
async function reportarPublicacion(postId) { if(confirm("¿Reportar post?")) { await addDoc(collection(db, "reports"), { postId: postId, reporterUid: currentUser.uid, timestamp: serverTimestamp() }); alert("Reportado."); } }

// --- CONTROL DE ACCIONES POSTS ---
async function hacerRepulse(pId) { const postOriginal = cacheTodosLosPosts.find(p => p.id === pId); if (!postOriginal || !datosMiPerfilGlobal) return; if (confirm("¿Re-pulsar esta publicación?")) { try { await addDoc(collection(db, "posts"), { text: postOriginal.text, imageUrl: postOriginal.imageUrl || null, uid: currentUser.uid, username: datosMiPerfilGlobal.username, likes: [], comments: [], timestamp: serverTimestamp(), isRepulse: true, originalAuthor: postOriginal.username, originalUid: postOriginal.uid, originalPostId: postOriginal.id }); if(postOriginal.uid !== currentUser.uid) await addDoc(collection(db, "notifications"), { toUid: postOriginal.uid, fromUsername: datosMiPerfilGlobal.username, type: 'repulse', timestamp: serverTimestamp() }); } catch(e) {} } }
async function toggleSeguirUsuario(uid) { if(!datosMiPerfilGlobal) return; const mR = doc(db, "users", currentUser.uid); const oR = doc(db, "users", uid); if(datosMiPerfilGlobal.following?.includes(uid)) { await updateDoc(mR, { following: arrayRemove(uid) }); await updateDoc(oR, { followersCount: increment(-1) }); } else { await updateDoc(mR, { following: arrayUnion(uid) }); await updateDoc(oR, { followersCount: increment(1) }); await addDoc(collection(db, "notifications"), { toUid: uid, fromUsername: datosMiPerfilGlobal.username, type: 'follow', timestamp: serverTimestamp() }); } }
async function darLike(pId, oUid) { const r = doc(db, "posts", pId); const d = (await getDoc(r)).data(); if(d.likes?.includes(currentUser.uid)) { await updateDoc(r, { likes: arrayRemove(currentUser.uid) }); } else { await updateDoc(r, { likes: arrayUnion(currentUser.uid) }); if(oUid !== currentUser.uid) await addDoc(collection(db, "notifications"), { toUid: oUid, fromUsername: datosMiPerfilGlobal.username, type: 'like', timestamp: serverTimestamp() }); } }
async function comentarPost(pId) { const t = prompt("Tu respuesta:"); if(t?.trim()) await updateDoc(doc(db, "posts", pId), { comments: arrayUnion({ username: datosMiPerfilGlobal.username, text: t.trim() }) }); }
async function borrarComentario(postId, commentStr) { if(confirm("¿Borrar comentario?")) { const cObj = JSON.parse(decodeURIComponent(commentStr)); await updateDoc(doc(db, "posts", postId), { comments: arrayRemove(cObj) }); } }
async function editarPerfil() { const b = prompt("Nueva biografía:"); if(b) await updateDoc(doc(db, "users", currentUser.uid), { bio: b.substring(0, 100) }); }
async function eliminarPost(pId) { if(confirm("¿Eliminar publicación?")) { await deleteDoc(doc(db, "posts", pId)); const repulsesSnap = await getDocs(query(collection(db, "posts"), where("originalPostId", "==", pId))); repulsesSnap.forEach(async (docSnap) => { await deleteDoc(docSnap.ref); }); } }

// --- AUTENTICACIÓN Y PANEL DE ADMIN OCULTO ---
onAuthStateChanged(auth, (user) => { 
  if(user) { 
    currentUser = user; 
    mostrarMuro(); 
    activarLecturaTiempoReal(); 
    escucharLlamadasEntrantes(); 
    
    // Inyección Panel de Administrador Oculto
    inicializarPanelAdmin(user);
    
  } else { 
    currentUser = null; 
    mostrarLogin(); 
    
    // APAGAR ABSOLUTAMENTE TODOS LOS LECTORES AL SALIR
    if (typeof desubscribirPosts === 'function') desubscribirPosts();
    if (typeof desubscribirReels === 'function') desubscribirReels();
    if (typeof desubscribirUsuarios === 'function') desubscribirUsuarios();
    if (typeof desubscribirNotif === 'function') desubscribirNotif();
    if (typeof desubscribirChatMensajes === 'function') desubscribirChatMensajes();
    if (typeof desubscribirStories === 'function') desubscribirStories();
    if (typeof desubscribirTyping === 'function') desubscribirTyping();
  } 
});

async function registrarUsuario(e, p, u) { try { const usernameBuscado = u.replace(/\s+/g, '').toLowerCase(); const c = await createUserWithEmailAndPassword(auth, e, p); await setDoc(doc(db, "users", c.user.uid), { uid: c.user.uid, username: usernameBuscado, followersCount: 0, following: [], blockedUsers: [], bio: "¡Hola! Acabo de unirme a plus." }); } catch(error) { alert("Error al registrar: " + error.message); } }
async function iniciarSesion(e, p) { try { await signInWithEmailAndPassword(auth, e, p); } catch(e) { alert("Error al iniciar."); } }
async function cerrarSesion() { await signOut(auth); }
async function eliminarMiCuenta() { if (!currentUser) return; if (confirm("¿Eliminar cuenta permanentemente? Perderás todo.")) { try { const postsSnap = await getDocs(query(collection(db, "posts"), where("uid", "==", currentUser.uid))); postsSnap.forEach(async (docSnap) => { await deleteDoc(docSnap.ref); }); const storiesSnap = await getDocs(query(collection(db, "stories"), where("uid", "==", currentUser.uid))); storiesSnap.forEach(async (docSnap) => { await deleteDoc(docSnap.ref); }); await deleteDoc(doc(db, "users", currentUser.uid)); await deleteUser(currentUser); alert("Eliminada."); } catch(e) { alert("Cierra sesión e inicia de nuevo para re-autenticar."); } } }

// --- LECTURA EN TIEMPO REAL (FIRESTORE) ---
function activarLecturaTiempoReal() {
    desubscribirPosts = onSnapshot(query(collection(db, "posts"), orderBy("timestamp", "desc")), (s) => { cacheTodosLosPosts = s.docs.map(d => ({ id: d.id, ...d.data() })); actualizarMurosYFeed(); });
    desubscribirReels = onSnapshot(query(collection(db, "reels"), orderBy("timestamp", "desc")), (s) => { cacheTodosLosReels = s.docs.map(d => ({ id: d.id, ...d.data() })); dibujarReels(cacheTodosLosReels); });
    desubscribirUsuarios = onSnapshot(collection(db, "users"), (s) => { usuariosGlobales = s.docs.map(d => d.data()); datosMiPerfilGlobal = usuariosGlobales.find(u => u.uid === currentUser.uid) || null; dibujarMiPerfil(); actualizarMurosYFeed(); });
    desubscribirNotif = onSnapshot(query(collection(db, "notifications"), where("toUid", "==", currentUser.uid)), (s) => {
        notificacionesGlobales = s.docs.map(d => ({ id: d.id, ...d.data() })); dibujarNotificaciones(notificacionesGlobales);
        const lastCheckedNotif = parseInt(localStorage.getItem('lastCheckedNotif') || "0"); const lastCheckedMensajes = parseInt(localStorage.getItem('lastCheckedMensajes') || "0");
        const bloqueados = datosMiPerfilGlobal?.blockedUsers || []; const notifValidas = notificacionesGlobales.filter(n => { const r = usuariosGlobales.find(u => u.username === n.fromUsername); return !r || !bloqueados.includes(r.uid); });
        
        const nN = notifValidas.filter(n => n.type !== 'message' && n.timestamp && n.timestamp.toMillis() > lastCheckedNotif).length;
        const bN = document.getElementById('badge-notif'); 
        if(bN) { if(nN > 0 && document.getElementById('tab-notificaciones')?.classList.contains('hidden')) { bN.innerText = nN; bN.classList.remove('hidden'); } else bN.classList.add('hidden'); }
        
        const nM = notifValidas.filter(n => n.type === 'message' && n.timestamp && n.timestamp.toMillis() > lastCheckedMensajes).length;
        const bM = document.getElementById('badge-mensajes'); 
        if(bM) { if(nM > 0 && document.getElementById('tab-mensajes')?.classList.contains('hidden') && !chatUserUidActivo) { bM.innerText = nM; bM.classList.remove('hidden'); } else bM.classList.add('hidden'); }
    });
    desubscribirStories = onSnapshot(query(collection(db, "stories"), orderBy("timestamp", "desc")), (s) => dibujarHistoriasBarra(s.docs.map(d => d.data())));
}

// --- LOGICA DEL SISTEMA DE VERIFICACIÓN (INTEGRADO CON PAYPAL REAL) ---
async function solicitarVerificacionCuenta() {
    if (!currentUser || !datosMiPerfilGlobal) { return alert("Debes iniciar sesión primero."); }
    
    // Remover duplicados previos del modal si existieran por error
    document.getElementById('modal-paypal-verificacion')?.remove();
    
    try {
        if (datosMiPerfilGlobal.verified === true && ['gold', 'green', 'blue'].includes(datosMiPerfilGlobal.badgeLevel)) { 
            return alert("Tu cuenta ya tiene una insignia VIP Premium. ¡Gracias por tu apoyo!"); 
        }

        const verifiedQuery = query(collection(db, "users"), where("verified", "==", true));
        const snapshotCount = await getCountFromServer(verifiedQuery);
        const totalVerificados = snapshotCount.data().count;

        const cuposRestantes = 100 - totalVerificados;
        const textoMorado = cuposRestantes > 0 ? `Gratis - ${cuposRestantes} cupos` : `Agotado`;

        // Crear la interfaz modal flotante para la selección
        const modal = document.createElement('div');
        modal.id = 'modal-paypal-verificacion';
        modal.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.9); z-index:5000; display:flex; justify-content:center; align-items:center; padding:15px; box-sizing:border-box;';
        modal.innerHTML = `
            <div style="background:#121b2d; width:100%; max-width:420px; border-radius:15px; border:1px solid #1e2d4a; padding:20px; box-sizing:border-box; color:#fff; font-family:sans-serif; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
                <div style="display:flex; align-items:center; border-bottom:1px solid #1e2d4a; padding-bottom:12px; margin-bottom:15px;">
                    <h3 style="margin:0; font-size:18px; color:#fff;">✔ Verificación de Cuenta VIP</h3>
                    <button onclick="document.getElementById('modal-paypal-verificacion').remove()" style="background:none; border:none; color:#fff; font-size:24px; cursor:pointer; margin-left:auto;">&times;</button>
                </div>
                <p style="font-size:13px; color:#8899a6; line-height:1.4; margin-bottom:15px;">Selecciona el color de insignia oficial que deseas desplegar en tu perfil y publicaciones:</p>
                
                <div style="display:flex; flex-direction:column; gap:10px; margin-bottom:20px;" id="badge-selector-container">
                    <label style="background:#1c273a; padding:12px; border-radius:10px; display:flex; align-items:center; justify-content:space-between; cursor:pointer; border:1px solid rgba(255,255,255,0.05);">
    <span><input type="radio" name="badge-opt" value="blue_free" checked> Insignia Azul 🔵 <small style="color:#8899a6; margin-left:5px;">(${textoMorado})</small></span>
    <span style="font-size:13px; color:#4ea2e6; font-weight:bold;">Gratis</span>
</label>

<label style="background:#1c273a; padding:12px; border-radius:10px; display:flex; align-items:center; justify-content:space-between; cursor:pointer; border:1px solid rgba(255,255,255,0.05);">
    <span><input type="radio" name="badge-opt" value="blue"> Insignia Azul 🔵 <small style="color:#8899a6; margin-left:5px;">VIP Premium</small></span>
    <span style="font-size:13px; color:#4ea2e6; font-weight:bold;">$10.00 USD</span>
</label>

<label style="background:#1c273a; padding:12px; border-radius:10px; display:flex; align-items:center; justify-content:space-between; cursor:pointer; border:1px solid rgba(255,255,255,0.05);">
    <span><input type="radio" name="badge-opt" value="gold"> Insignia Dorada 🟡 <small style="color:#8899a6; margin-left:5px;">VIP Premium</small></span>
    <span style="font-size:13px; color:#ffb300; font-weight:bold;">$25.00 USD</span>
</label>

                </div>
                
                <div id="paypal-button-render-zone" style="margin-top:15px; min-height: 45px;">
                    </div>
            </div>
        `;
        document.body.appendChild(modal);

        // Controladores de eventos de actualización dinámica
        const radios = modal.querySelectorAll('input[name="badge-opt"]');
        const renderZone = modal.querySelector('#paypal-button-render-zone');
        
        const actualizarZonaPago = () => {
            const seleccion = modal.querySelector('input[name="badge-opt"]:checked').value;
            
            if (seleccion === 'blue_free' || seleccion === 'black') {
        renderZone.innerHTML = `<button class="btn-plus" id="btn-procesar-gratis" style="background:#fff; color:#090e17; font-weight:bold; border-radius:25px; padding:12px; width:100%; border:none; cursor:pointer;">Activar Insignia Gratis</button>`;

        modal.querySelector('#btn-procesar-gratis').onclick = async () => {
            
            // --- 1. LÓGICA SI ELIGE LA NEGRA VIP ---
            if (seleccion === 'black') {
                await updateDoc(doc(db, "users", currentUser.uid), { verified: true, badgeLevel: 'black' });
                alert("¡Felicidades! Obtuviste tu insignia negra VIP oficial.");
                modal.remove();
            } 
            
            // --- 2. LÓGICA ORIGINAL SI ELIGE LA AZUL GRATIS ---
            else {
                if (datosMiPerfilGlobal.verified === true && datosMiPerfilGlobal.badgeLevel === 'blue') {
                    return alert("Ya posees la insignia azul.");
                }
                if (totalVerificados < 100) {
                    await updateDoc(doc(db, "users", currentUser.uid), { verified: true, badgeLevel: 'blue' });
                    alert("¡Felicidades! Obtuviste tu insignia azul oficial gratis.");
                    modal.remove();
                } else {
                    alert("Lo sentimos, los 100 cupos gratuitos para la insignia azul se han agotado. Puedes elegir una opción Premium.");
                }
            }
        };
            } else {
                renderZone.innerHTML = `<div id="paypal-smart-button-container"></div>`;
                // Cargar dinámicamente el SDK de PayPal si no está cargado en la cabecera HTML
                if (!window.paypal) {
                    const script = document.createElement('script');
                    // NOTA: Reemplaza client-id=test por tu Client ID real de PayPal (Sandbox o Live)
                    script.src = "https://www.paypal.com/sdk/js?client-id=test&currency=USD"; 
                    script.onload = () => inicializarPaypalButtons(seleccion);
                    document.head.appendChild(script);
                } else {
                    inicializarPaypalButtons(seleccion);
                }
            }
        };

        radios.forEach(r => r.addEventListener('change', actualizarZonaPago));
        // Ejecutar inicialización de vista inicial por defecto
        actualizarZonaPago();

// Función encargada de instanciar la pasarela delegando la seguridad al servidor
function inicializarPaypalButtons(colorElegido) {
    if (!window.paypal || !document.getElementById('paypal-smart-button-container')) return;
    document.getElementById('paypal-smart-button-container').innerHTML = '';
    
    window.paypal.Buttons({
        style: { layout: 'vertical', color: 'blue', shape: 'pill', label: 'paypal' },
        
        createOrder: function(data, actions) {
            return actions.order.create({
                purchase_units: [{
                    description: `Insignia VIP Premium Oficial [${colorElegido.toUpperCase()}]`,
                    amount: { 
    currency_code: "USD", 
    value: colorElegido === 'gold' ? "25.00" : "10.00" 
}
                }]
            });
        },
        
        onApprove: async function(data, actions) {
            // EL CAMBIO ESTÁ AQUÍ: En lugar de guardar en Firebase, llamamos a tu servidor Render
            const btnProcesando = document.getElementById('paypal-smart-button-container');
            btnProcesando.innerHTML = '<p style="text-align:center; color:#4ea2e6;">Verificando pago de forma segura...</p>';

            try {
                // Petición a tu servidor seguro en Render
                const response = await fetch('https://servidor-2-lnvw.onrender.com/verify-payment', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        orderID: data.orderID,          // El ID de la orden que dio PayPal
                        uid: currentUser.uid,           // A quién le daremos la insignia
                        badgeLevel: colorElegido        // Qué color compró
                    })
                });

                const result = await response.json();

                if (response.ok && result.success) {
                    alert(`¡Pago verificado y asegurado! Tu insignia ${colorElegido.toUpperCase()} VIP está activa.`);
                    document.getElementById('modal-paypal-verificacion').remove();
                } else {
                    alert("El servidor rechazó la verificación del pago: " + (result.error || "Error desconocido."));
                    inicializarPaypalButtons(colorElegido); // Restaurar botones si falla
                }
            } catch(err) {
                console.error("Error contactando al servidor Render:", err);
                alert("No se pudo contactar con el servidor de seguridad. Si se cobró, contacta soporte.");
                inicializarPaypalButtons(colorElegido);
            }
        },
        
        onError: function(err) {
            console.error("PayPal Error:", err);
            alert("La transacción fue declinada o hubo un error con la pasarela.");
        }
    }).render('#paypal-smart-button-container');
}

    } catch (error) { 
        console.error("Error general:", error); 
        alert("Hubo un problema al procesar tu solicitud."); 
    }
}

// ==========================================================================
// 🛡️ LÓGICA DEL PANEL DE ADMINISTRADOR OCULTO
// ==========================================================================
function inicializarPanelAdmin(user) {
    // CAMBIA AQUÍ EL CORREO DEL ADMINISTRADOR
    const ADMIN_EMAIL = "davidsonjean210@gmail.com"; 

    if (user && user.email === ADMIN_EMAIL) {
        // Inyectar el botón en la barra de navegación si no existe
        if (!document.getElementById('btn-admin-hidden')) {
            const nav = document.querySelector('.bottom-nav');
            if (nav) {
                const btnAdmin = document.createElement('button');
                btnAdmin.className = 'nav-btn';
                btnAdmin.id = 'btn-admin-hidden';
                btnAdmin.innerHTML = '🛡️';
                btnAdmin.onclick = () => window.abrirModalAdmin();
                nav.appendChild(btnAdmin);
            }
        }
    }
}

function abrirModalAdmin() {
    let modal = document.getElementById('modal-admin-oculto');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modal-admin-oculto';
        modal.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.95); z-index:5000; display:flex; flex-direction:column; justify-content:center; align-items:center; padding:20px; box-sizing:border-box; color:white; animation: fadeSlideUp 0.3s ease;';
        document.body.appendChild(modal);
    }
    
    modal.classList.remove('hidden');
    modal.innerHTML = `
        <div style="background:var(--bg-principal); width:100%; max-width:400px; padding:20px; border-radius:15px; border:1px solid #ff4a5a;">
            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #333; padding-bottom:10px; margin-bottom:20px;">
                <h2 style="margin:0; color:#ff4a5a;">🛡️ Panel de Control Admin</h2>
                <button onclick="document.getElementById('modal-admin-oculto').classList.add('hidden')" style="background:none; border:none; color:white; font-size:28px; cursor:pointer;">×</button>
            </div>
            
            <p style="color:var(--texto-gris); font-size:13px; margin-bottom: 20px;">Utiliza los IDs visibles bajo los nombres en los feeds para ejecutar acciones.</p>
            
            <button class="btn-plus" onclick="window.adminEliminarCualquierPost()" style="margin-bottom:15px; background:transparent; border: 1px solid #ff4a5a; color:#ff4a5a;">🗑️ Eliminar un Post por ID</button>
            <button class="btn-plus" onclick="window.adminBloquearUsuario()" style="margin-bottom:15px; background:#ff4a5a; color:white;">🚫 Banear Usuario por UID</button>
        </div>
    `;
}

async function adminEliminarCualquierPost() {
    const id = prompt("Introduce el ID exacto del Post a eliminar:");
    if (id) {
        if(confirm("¿Seguro? Esta acción es irreversible.")) {
            try {
                await deleteDoc(doc(db, "posts", id));
                alert("Post eliminado exitosamente del servidor.");
            } catch (e) { alert("Error al eliminar post. Verifica el ID."); }
        }
    }
}

async function adminBloquearUsuario() {
    const id = prompt("Introduce el UID del Usuario a banear de la plataforma:");
    if (id) {
        if(confirm("¿Seguro que quieres borrar a este usuario por completo de la base de datos Firestore?")) {
            try {
                await deleteDoc(doc(db, "users", id));
                alert("Usuario borrado. Ya no podrá iniciar sesión correctamente.");
            } catch(e) { alert("Error al banear usuario. Verifica el UID."); }
        }
    }
}
 // Función para solicitar permiso y guardar token FCM
window.solicitarPermisoNotificaciones = async function() {
    if (!currentUser) {
        alert("Debes iniciar sesión para activar las notificaciones.");
        return;
    }

    try {
        // Solicitar permiso al usuario
        const permiso = await Notification.requestPermission();
        
        if (permiso === "granted") {
            // Obtener el token. RECUERDA: Debes tener tu VAPID Key generada en Firebase Cloud Messaging
            const tokenActual = await getToken(messaging, { 
                vapidKey: 'BMu2b5OZyIpOD0d-ISq0PTuX1tdQZON8EDBtQ_oXfjAi8i5FWoAtS9WMNMq7kjz8JQVXkNIw_rGTfTZEnqLyZKE' 
            });
            
            if (tokenActual) {
                // Guardar en Firestore
                const usuarioRef = doc(db, "users", currentUser.uid);
                await updateDoc(usuarioRef, {
                    fcmToken: tokenActual
                });
                console.log("Token FCM guardado correctamente.");
                alert("¡Notificaciones activadas! 🔔");
            }
        } else {
            alert("Permiso denegado. Puedes activarlo desde los ajustes de tu navegador.");
        }
    } catch (error) {
        console.error("Error al activar notificaciones:", error);
    }
};

// --- BINDING DE EVENTOS & EXPOSICIÓN WINDOW ---
document.getElementById('chat-input-text')?.addEventListener('input', manejarInputChat);

window.abrirConfiguracion = abrirConfiguracion; window.cerrarConfiguracion = cerrarConfiguracion;
window.registrarUsuario = registrarUsuario; 
window.iniciarSesion = iniciarSesion; 
window.cerrarSesion = cerrarSesion; 
window.crearPublicacion = crearPublicacion; window.toggleSeguirUsuario = toggleSeguirUsuario; 
window.navegarA = navegarA; 
window.ejecutarBusquedaLocal = ejecutarBusquedaLocal; window.setModoBusquedaActiva = setModoBusquedaActiva; window.buscarTagDirecto = buscarTagDirecto; 
window.darLike = darLike; 
window.comentarPost = comentarPost; 
window.editarPerfil = editarPerfil; 
window.eliminarPost = eliminarPost; 
window.reportarPublicacion = reportarPublicacion; window.bloquearPersona = bloquearPersona; window.desbloquearPersona = desbloquearPersona; window.verBloqueados = verBloqueados; 
window.abrirChatCon = abrirChatCon; 
window.cerrarChatActivo = cerrarChatActivo; window.enviarMensajePrivado = enviarMensajePrivado; window.enviarFotoEnChat = enviarFotoEnChat; window.borrarMensajeChat = borrarMensajeChat; window.crearNuevaHistoria = crearNuevaHistoria; window.reproducirHistoria = reproducirHistoria; window.terminarVisorHistoria = terminarVisorHistoria; window.enviarRespuestaHistoria = enviarRespuestaHistoria; window.verPerfilUsuario = verPerfilUsuario; window.subirImagenPerfil = subirImagenPerfil; 
window.verSeguidores = verSeguidores; 
window.cerrarModalListaUI = cerrarModalListaUI; window.verSiguiendo = verSiguiendo; 
window.borrarComentario = borrarComentario; 
window.hacerRepulse = hacerRepulse; 
window.eliminarMiCuenta = eliminarMiCuenta; 
window.iniciarLlamada = iniciarLlamada; 
window.responderLlamada = responderLlamada; window.finalizarLlamada = finalizarLlamada; 
window.toggleMic = toggleMic; 
window.toggleCam = toggleCam; 
window.darLikeReel = darLikeReel; 
window.comentarReel = comentarReel; 
window.eliminarReel = eliminarReel;
window.solicitarVerificacionCuenta = solicitarVerificacionCuenta;

// Exposición Window para Panel de Admin Oculto
window.abrirModalAdmin = abrirModalAdmin;
window.adminEliminarCualquierPost = adminEliminarCualquierPost;
window.adminBloquearUsuario = adminBloquearUsuario;

window.addEventListener('beforeunload', () => { if (llamadaActualId) updateDoc(doc(db, "calls", llamadaActualId), { status: 'ended' }).catch(() => {}); });