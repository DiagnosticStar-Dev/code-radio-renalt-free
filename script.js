// ===== FIREBASE CONFIG =====
const FIREBASE_URL = "https://rnault-radio-code-free-default-rtdb.europe-west1.firebasedatabase.app";
const DOWNLOAD_LINK_PATH = "/download_url.json";
const USAGE_STATS_PATH = "/UsageStats/download_count.json";

// ===== SECURITY TOKEN (غير هذا التوكن عند النشر!) =====
const SECURITY_TOKEN = "YOUR_SECRET_TOKEN_HERE"; // غير هذا!

// ===== CANVAS ANIMATION =====
const canvas = document.getElementById('particleCanvas');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const particles = [];
const particleCount = 80;

class Particle {
    constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.vx = (Math.random() - 0.5) * 1;
        this.vy = (Math.random() - 0.5) * 1;
        this.radius = Math.random() * 2 + 1;
        this.opacity = Math.random() * 0.5 + 0.2;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;

        if (this.x < 0) this.x = canvas.width;
        if (this.x > canvas.width) this.x = 0;
        if (this.y < 0) this.y = canvas.height;
        if (this.y > canvas.height) this.y = 0;
    }

    draw() {
        ctx.fillStyle = `rgba(255, 204, 0, ${this.opacity})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
    }
}

function initParticles() {
    for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle());
    }
}

function drawLines() {
    for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
            const dx = particles[i].x - particles[j].x;
            const dy = particles[i].y - particles[j].y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < 150) {
                ctx.strokeStyle = `rgba(255, 204, 0, ${0.1 * (1 - distance / 150)})`;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(particles[i].x, particles[i].y);
                ctx.lineTo(particles[j].x, particles[j].y);
                ctx.stroke();
            }
        }
    }
}

function animate() {
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    particles.forEach(particle => {
        particle.update();
        particle.draw();
    });

    drawLines();
    requestAnimationFrame(animate);
}

window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});

initParticles();
animate();

// ===== LOAD DOWNLOAD COUNT =====
async function loadDownloadCount() {
    try {
        console.log("📊 Fetching download count from UsageStats...");
        const response = await fetch(FIREBASE_URL + USAGE_STATS_PATH);
        
        if (!response.ok) throw new Error('Failed to fetch count');
        
        const count = await response.json();
        console.log("✓ Count from Firebase:", count);
        document.getElementById('downloadCount').textContent = count || 0;
        
    } catch (error) {
        console.error("❌ Error loading from Firebase:", error);
        const localCount = localStorage.getItem('downloadCount') || 0;
        document.getElementById('downloadCount').textContent = localCount;
        console.log("📱 Using local count:", localCount);
    }
}

// ===== UPDATE DOWNLOAD COUNT =====
async function updateDownloadCount() {
    try {
        console.log("🔄 Updating download count in UsageStats...");
        
        // جلب الرقم الحالي
        const response = await fetch(FIREBASE_URL + USAGE_STATS_PATH);
        
        let currentCount = 0;
        if (response.ok) {
            currentCount = await response.json() || 0;
        }
        
        const newCount = currentCount + 1;
        console.log(`Current: ${currentCount}, New: ${newCount}`);

        // تحديث Firebase في UsageStats مع التوكن
        const updateResponse = await fetch(FIREBASE_URL + USAGE_STATS_PATH + `?auth=${SECURITY_TOKEN}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newCount)
        });
        
        if (!updateResponse.ok) {
            console.warn("⚠️ Firebase update failed, using local storage");
            localStorage.setItem('downloadCount', newCount);
        } else {
            console.log("✓ Successfully updated Firebase UsageStats");
        }
        
        document.getElementById('downloadCount').textContent = newCount;
        localStorage.setItem('downloadCount', newCount);
        console.log("✓ Download count updated to:", newCount);
        return newCount;
        
    } catch (error) {
        console.error("❌ Error updating count:", error);
        
        let localCount = parseInt(localStorage.getItem('downloadCount') || 0) + 1;
        localStorage.setItem('downloadCount', localCount);
        document.getElementById('downloadCount').textContent = localCount;
        console.log("📱 Local count updated to:", localCount);
        
        return localCount;
    }
}

// ===== DOWNLOAD BUTTON CLICK =====
const downloadBtn = document.getElementById("downloadButton");
if (downloadBtn) {
    downloadBtn.addEventListener("click", async function() {
        const statusEl = document.getElementById("status");
        
        this.disabled = true;
        this.innerHTML = '<span class="button-icon">⏳</span><span class="button-text">LOADING...</span>';
        statusEl.textContent = "جاري جلب رابط التحميل...";
        
        try {
            console.log("🔗 Fetching download URL...");
            
            const urlResponse = await fetch(FIREBASE_URL + DOWNLOAD_LINK_PATH);
            if (!urlResponse.ok) throw new Error('HTTP error! status: ' + urlResponse.status);
            
            const downloadUrl = await urlResponse.json();
            console.log("✓ Download URL received:", downloadUrl);
            
            if (downloadUrl && typeof downloadUrl === 'string' && downloadUrl.trim() !== "") {
                statusEl.textContent = "✓ جاري تحديث العداد...";
                console.log("📥 Updating download count...");
                
                // تحديث العداد في UsageStats
                const newCount = await updateDownloadCount();
                
                setTimeout(() => {
                    statusEl.textContent = `✓ شكراً! تم التحميل من قبل ${newCount} شخص`;
                    console.log("📥 Starting download...");
                    window.location.href = downloadUrl;
                    
                    setTimeout(() => {
                        this.disabled = false;
                        this.innerHTML = '<span class="button-icon">⬇️</span><span class="button-text">DOWNLOAD NOW</span>';
                    }, 2000);
                }, 500);
            } else {
                statusEl.textContent = "❌ خطأ: رابط التحميل غير صحيح";
                this.disabled = false;
                this.innerHTML = '<span class="button-icon">⬇️</span><span class="button-text">DOWNLOAD NOW</span>';
            }
        } catch (error) {
            console.error("❌ Error:", error);
            statusEl.textContent = "❌ خطأ: " + error.message;
            this.disabled = false;
            this.innerHTML = '<span class="button-icon">⬇️</span><span class="button-text">DOWNLOAD NOW</span>';
        }
    });
}

// ===== CLOSE BUTTON =====
const closeBtn = document.querySelector(".close-btn");
if (closeBtn) {
    closeBtn.addEventListener("click", function() {
        window.close();
    });
}

// ===== ON PAGE LOAD =====
window.addEventListener('load', function() {
    console.log("✓ Page loaded successfully!");
    loadDownloadCount();
});