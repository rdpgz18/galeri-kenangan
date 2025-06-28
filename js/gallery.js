import { auth, storage, db } from './firebase-config.js';

// DOM Elements
const fileInput = document.getElementById('fileInput');
const uploadProgress = document.getElementById('uploadProgress');
const progressBar = document.getElementById('progressBar');
const progressPercent = document.getElementById('progressPercent');
const previewContainer = document.getElementById('previewContainer');
const galleryContainer = document.getElementById('galleryContainer');
const albumsContainer = document.getElementById('albumsContainer');
const sortSelect = document.getElementById('sortSelect');
const loadingIndicator = document.getElementById('loadingIndicator');
const createAlbumModal = document.getElementById('createAlbumModal');
const closeCreateAlbumModal = document.getElementById('closeCreateAlbumModal');
const createAlbumForm = document.getElementById('createAlbumForm');
const photoModal = document.getElementById('photoModal');
const closePhotoModal = document.getElementById('closePhotoModal');
const modalPhoto = document.getElementById('modalPhoto');
const photoOwnerAvatar = document.getElementById('photoOwnerAvatar');
const photoOwnerName = document.getElementById('photoOwnerName');
const photoDate = document.getElementById('photoDate');
const photoDescription = document.getElementById('photoDescription');
const photoComments = document.getElementById('photoComments');
const addCommentForm = document.getElementById('addCommentForm');

// Global variables
let currentPhotoId = null;
let lastVisible = null;
let loading = false;

// Initialize drag and drop
const uploadArea = document.querySelector('label[for="fileInput"]');

uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('drag-over');
});

uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('drag-over');
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('drag-over');
    if (e.dataTransfer.files.length > 0) {
        fileInput.files = e.dataTransfer.files;
        handleFiles(fileInput.files);
    }
});

// File input change handler
fileInput.addEventListener('change', () => {
    if (fileInput.files.length > 0) {
        handleFiles(fileInput.files);
    }
});

// Handle selected files
function handleFiles(files) {
    previewContainer.innerHTML = '';
    
    Array.from(files).forEach(file => {
        if (!file.type.match('image.*')) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const previewDiv = document.createElement('div');
            previewDiv.className = 'w-24 h-24 relative';
            
            const img = document.createElement('img');
            img.src = e.target.result;
            img.className = 'w-full h-full object-cover rounded';
            
            previewDiv.appendChild(img);
            previewContainer.appendChild(previewDiv);
        };
        reader.readAsDataURL(file);
    });
    
    uploadFiles(files);
}

// Upload files to Firebase Storage
function uploadFiles(files) {
    if (!auth.currentUser) return;
    
    uploadProgress.classList.remove('hidden');
    const userId = auth.currentUser.uid;
    const uploadTime = Date.now();
    
    Array.from(files).forEach((file, index) => {
        if (!file.type.match('image.*')) return;
        
        const storageRef = storage.ref(`users/${userId}/photos/${uploadTime}_${file.name}`);
        const uploadTask = storageRef.put(file);
        
        uploadTask.on('state_changed',
            (snapshot) => {
                // Progress tracking
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                progressBar.style.width = progress + '%';
                progressPercent.textContent = Math.round(progress) + '%';
            },
            (error) => {
                console.error('Upload error:', error);
                alert('Upload error: ' + error.message);
            },
            () => {
                // Upload complete
                uploadTask.snapshot.ref.getDownloadURL().then((downloadURL) => {
                    // Save photo metadata to Firestore
                    db.collection('photos').add({
                        userId: userId,
                        url: downloadURL,
                        name: file.name,
                        size: file.size,
                        type: file.type,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                        description: '',
                        albumId: null
                    }).then(() => {
                        if (index === files.length - 1) {
                            uploadProgress.classList.add('hidden');
                            fileInput.value = '';
                            previewContainer.innerHTML = '';
                            loadPhotos();
                        }
                    });
                });
            }
        );
    });
}

// Load photos from Firestore
function loadPhotos() {
    if (loading) return;
    loading = true;
    loadingIndicator.classList.remove('hidden');
    
    let query = db.collection('photos')
        .orderBy('createdAt', sortSelect.value === 'newest' ? 'desc' : 'asc')
        .limit(12);
    
    if (lastVisible) {
        query = query.startAfter(lastVisible);
    }
    
    query.get().then((querySnapshot) => {
        if (querySnapshot.empty) {
            loadingIndicator.classList.add('hidden');
            return;
        }
        
        lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1];
        
        querySnapshot.forEach(doc => {
            const photo = doc.data();
            createPhotoCard(photo, doc.id);
        });
        
        loading = false;
        loadingIndicator.classList.add('hidden');
    });
}

// Create photo card element
function createPhotoCard(photo, photoId) {
    const photoItem = document.createElement('div');
    photoItem.className = 'photo-item photo-loaded';
    photoItem.dataset.id = photoId;
    
    const img = document.createElement('img');
    img.src = photo.url;
    img.alt = photo.name;
    img.loading = 'lazy';
    
    const overlay = document.createElement('div');
    overlay.className = 'photo-overlay';
    
    const viewBtn = document.createElement('button');
    viewBtn.className = 'bg-white dark:bg-gray-800 text-gray-800 dark:text-white px-3 py-1 rounded-full';
    viewBtn.innerHTML = '<i class="fas fa-eye mr-1"></i> Lihat';
    viewBtn.addEventListener('click', () => openPhotoModal(photoId));
    
    overlay.appendChild(viewBtn);
    photoItem.appendChild(img);
    photoItem.appendChild(overlay);
    
    galleryContainer.appendChild(photoItem);
}

// Open photo modal
function openPhotoModal(photoId) {
    currentPhotoId = photoId;
    
    db.collection('photos').doc(photoId).get().then(doc => {
        if (!doc.exists) return;
        
        const photo = doc.data();
        modalPhoto.src = photo.url;
        photoDescription.textContent = photo.description || 'Tidak ada deskripsi';
        photoDate.textContent = new Date(photo.createdAt?.toDate()).toLocaleDateString();
        
        // Load photo owner info
        db.collection('users').doc(photo.userId).get().then(userDoc => {
            if (userDoc.exists) {
                const user = userDoc.data();
                photoOwnerName.textContent = user.displayName || 'Pengguna';
                photoOwnerAvatar.src = user.photoURL || 'https://via.placeholder.com/40';
            }
        });
        
        // Load comments
        loadComments(photoId);
        
        photoModal.classList.remove('hidden');
    });
}

// Load comments for a photo
function loadComments(photoId) {
    photoComments.innerHTML = '';
    
    db.collection('photos').doc(photoId).collection('comments')
        .orderBy('createdAt', 'asc')
        .get()
        .then(querySnapshot => {
            if (querySnapshot.empty) {
                const noComments = document.createElement('p');
                noComments.className = 'text-gray-500 dark:text-gray-400 italic';
                noComments.textContent = 'Belum ada komentar';
                photoComments.appendChild(noComments);
                return;
            }
            
            querySnapshot.forEach(doc => {
                const comment = doc.data();
                addCommentToDOM(comment);
            });
        });
}

// Add comment to DOM
function addCommentToDOM(comment) {
    const commentDiv = document.createElement('div');
    commentDiv.className = 'flex items-start space-x-3';
    
    const avatar = document.createElement('img');
    avatar.src = comment.userAvatar || 'https://via.placeholder.com/32';
    avatar.className = 'h-8 w-8 rounded-full mt-1';
    
    const contentDiv = document.createElement('div');
    
    const name = document.createElement('p');
    name.className = 'font-semibold text-sm text-gray-800 dark:text-white';
    name.textContent = comment.userName;
    
    const text = document.createElement('p');
    text.className = 'text-sm text-gray-600 dark:text-gray-300';
    text.textContent = comment.text;
    
    const time = document.createElement('p');
    time.className = 'text-xs text-gray-500 dark:text-gray-400';
    time.textContent = new Date(comment.createdAt?.toDate()).toLocaleString();
    
    contentDiv.appendChild(name);
    contentDiv.appendChild(text);
    contentDiv.appendChild(time);
    commentDiv.appendChild(avatar);
    commentDiv.appendChild(contentDiv);
    
    photoComments.appendChild(commentDiv);
}

// Load albums
function loadAlbums() {
    if (!auth.currentUser) return;
    
    albumsContainer.innerHTML = '';
    
    db.collection('albums')
        .where('userId', '==', auth.currentUser.uid)
        .orderBy('createdAt', 'desc')
        .get()
        .then(querySnapshot => {
            if (querySnapshot.empty) {
                const noAlbums = document.createElement('p');
                noAlbums.className = 'text-gray-500 dark:text-gray-400 col-span-full text-center py-8';
                noAlbums.textContent = 'Belum ada album. Buat album pertama Anda!';
                albumsContainer.appendChild(noAlbums);
                return;
            }
            
            querySnapshot.forEach(doc => {
                const album = doc.data();
                createAlbumCard(album, doc.id);
            });
        });
}

// Create album card
function createAlbumCard(album, albumId) {
    const albumItem = document.createElement('div');
    albumItem.className = 'bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden hover:shadow-lg transition duration-300';
    
    const imgDiv = document.createElement('div');
    imgDiv.className = 'h-40 bg-gray-200 dark:bg-gray-700 relative overflow-hidden';
    
    const img = document.createElement('img');
    img.src = album.coverUrl || 'https://via.placeholder.com/300';
    img.alt = album.name;
    img.className = 'w-full h-full object-cover';
    
    const overlay = document.createElement('div');
    overlay.className = 'absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center opacity-0 hover:opacity-100 transition duration-300';
    
    const photoCount = document.createElement('span');
    photoCount.className = 'bg-white dark:bg-gray-800 text-gray-800 dark:text-white px-3 py-1 rounded-full text-sm';
    photoCount.textContent = `${album.photoCount || 0} Foto`;
    
    overlay.appendChild(photoCount);
    imgDiv.appendChild(img);
    imgDiv.appendChild(overlay);
    
    const infoDiv = document.createElement('div');
    infoDiv.className = 'p-4';
    
    const title = document.createElement('h3');
    title.className = 'font-bold text-lg text-gray-800 dark:text-white mb-1 truncate';
    title.textContent = album.name;
    
    const desc = document.createElement('p');
    desc.className = 'text-gray-600 dark:text-gray-300 text-sm truncate';
    desc.textContent = album.description || 'Tidak ada deskripsi';
    
    infoDiv.appendChild(title);
    infoDiv.appendChild(desc);
    albumItem.appendChild(imgDiv);
    albumItem.appendChild(infoDiv);
    
    albumItem.addEventListener('click', () => {
        // TODO: Filter photos by album
        console.log('View album:', albumId);
    });
    
    albumsContainer.appendChild(albumItem);
}

// Create new album
createAlbumForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    
    const name = document.getElementById('albumName').value;
    const description = document.getElementById('albumDescription').value;
    const coverFile = document.getElementById('albumCover').files[0];
    
    if (!name) {
        alert('Nama album harus diisi');
        return;
    }
    
    const userId = auth.currentUser.uid;
    const albumData = {
        userId: userId,
        name: name,
        description: description,
        photoCount: 0,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    if (coverFile) {
        const storageRef = storage.ref(`users/${userId}/album_covers/${Date.now()}_${coverFile.name}`);
        storageRef.put(coverFile).then(snapshot => {
            return snapshot.ref.getDownloadURL();
        }).then(downloadURL => {
            albumData.coverUrl = downloadURL;
            saveAlbum(albumData);
        });
    } else {
        saveAlbum(albumData);
    }
});

function saveAlbum(albumData) {
    db.collection('albums').add(albumData)
        .then(() => {
            createAlbumModal.classList.add('hidden');
            createAlbumForm.reset();
            loadAlbums();
        })
        .catch(error => {
            console.error('Error creating album:', error);
            alert('Gagal membuat album: ' + error.message);
        });
}

// Add comment
addCommentForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!auth.currentUser || !currentPhotoId) return;
    
    const commentText = document.getElementById('commentInput').value.trim();
    if (!commentText) return;
    
    const user = auth.currentUser;
    const comment = {
        userId: user.uid,
        userName: user.displayName || user.email.split('@')[0],
        userAvatar: user.photoURL || '',
        text: commentText,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    db.collection('photos').doc(currentPhotoId).collection('comments').add(comment)
        .then(() => {
            document.getElementById('commentInput').value = '';
            addCommentToDOM(comment);
        })
        .catch(error => {
            console.error('Error adding comment:', error);
        });
});

// Close modals
closeCreateAlbumModal.addEventListener('click', () => {
    createAlbumModal.classList.add('hidden');
});

closePhotoModal.addEventListener('click', () => {
    photoModal.classList.add('hidden');
});

// Sort photos
sortSelect.addEventListener('change', () => {
    galleryContainer.innerHTML = '';
    lastVisible = null;
    loadPhotos();
});

// Create album button
createAlbumBtn.addEventListener('click', () => {
    createAlbumModal.classList.remove('hidden');
});

// Infinite scroll
window.addEventListener('scroll', () => {
    if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 500) {
        loadPhotos();
    }
});

// Initialize
auth.onAuthStateChanged(user => {
    if (user) {
        loadPhotos();
        loadAlbums();
    }
});
