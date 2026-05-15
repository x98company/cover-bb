(async () => {
	/**
	 * Bearbit Cover Next - Clean & Enhanced Version
	 * Features: 
	 * - Automatic Thumbnail fetching (ScreenShot/Cover)
	 * - Download Guard Bypass (Double-Fetch + Referer Spoofing)
	 * - Auto-Thanks button trigger on download
	 * - Configurable Thumbnail sizes via Settings button
	 * - Lightbox for full-size image preview
	 * - UI Cleanup (Remove redundant buttons)
	 */

	// --- ส่วนที่ 0: ระบบตั้งค่า (Settings) ---
	const getSettings = () => {
		const defaultSettings = { thumbWidth: 60, thumbHeight: 85 };
		const saved = localStorage.getItem('bb_cover_settings');
		return saved ? JSON.parse(saved) : defaultSettings;
	};

	const saveSettings = (width, height) => {
		localStorage.setItem('bb_cover_settings', JSON.stringify({ thumbWidth: width, thumbHeight: height }));
		location.reload();
	};

	const settings = getSettings();

	const setupSettingsUI = () => {
		if (document.getElementById('bb-settings-btn')) return;
		const btn = document.createElement('div');
		btn.id = 'bb-settings-btn';
		btn.innerHTML = '⚙️';
		btn.style.cssText = `
			position: fixed; bottom: 20px; left: 20px; z-index: 999999;
			width: 42px; height: 42px; background: white; border-radius: 50%;
			display: flex; align-items: center; justify-content: center;
			font-size: 22px; cursor: pointer; box-shadow: 0 4px 15px rgba(0,0,0,0.2);
			border: 1px solid #e2e8f0; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
		`;
		btn.onmouseover = () => { btn.style.transform = 'rotate(90deg) scale(1.1)'; btn.style.background = '#f1f5f9'; };
		btn.onmouseout = () => { btn.style.transform = 'rotate(0deg) scale(1)'; btn.style.background = 'white'; };
		btn.onclick = () => {
			const w = prompt("ระบุความกว้าง Thumbnail (px):", settings.thumbWidth);
			if (w === null) return;
			const h = prompt("ระบุความสูง Thumbnail (px):", settings.thumbHeight);
			if (h === null) return;
			saveSettings(parseInt(w) || 60, parseInt(h) || 85);
		};
		document.body.appendChild(btn);
	};
	setupSettingsUI();

	// --- ส่วนที่ 1: จัดการโครงสร้างหน้าเว็บและล้างส่วนที่ไม่ต้องการ ---
	try {
		var tables = document.getElementsByTagName('table');
		tables = Array.from(tables).filter(tbl => tbl.getAttribute('width') === "100%");
		if (tables.length == 4) {
			var rows = Array.from(tables[2].querySelectorAll('tbody tr')).slice(1);
			var tbody2 = tables[3].querySelector('tbody');
			rows.reverse().forEach(row => {
				tbody2.insertBefore(row, tbody2.children[1]);
			});
			tables[2].parentNode.removeChild(tables[2]);
		}
	} catch (e) {
		console.error('pre-init error', e);
	}

	// ลบกลุ่มปุ่มเดิม (ดูรูป / VIP / Bookmark)
	document.querySelectorAll('div[style*="display:flex"][style*="align-items:center"]').forEach(el => {
		if (el.querySelector('a[class*="vip"]') || el.textContent.includes('ดูรูป')) {
			el.remove();
		}
	});

	// ลบรูปภาพใหญ่เดิมในคอลัมน์รูป
	document.querySelectorAll('td.poster-column img').forEach(img => img.remove());
	document.querySelectorAll('td.poster-column').forEach(td => {
		td.style.width = (settings.thumbWidth + 20) + "px";
		td.style.textAlign = "center";
	});

	// ซ่อนปุ่ม VIP เดิมๆ
	document.querySelectorAll('.download-btn-vip').forEach(el => el.style.display = "none");

	// --- ส่วนที่ 2: ระบบ Lightbox ---
	const setupLightbox = () => {
		let modal = document.getElementById('bb-lightbox');
		if (!modal) {
			modal = document.createElement('div');
			modal.id = 'bb-lightbox';
			modal.style.cssText = `
				display: none; position: fixed; z-index: 9999999; left: 0; top: 0;
				width: 100%; height: 100%; background: rgba(0,0,0,0.9);
				cursor: zoom-out; justify-content: center; align-items: center;
				backdrop-filter: blur(8px); transition: opacity 0.3s;
			`;
			modal.innerHTML = `<img id="bb-lightbox-img" style="max-width: 95%; max-height: 95%; border: 4px solid white; border-radius: 8px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); background: white;">`;
			modal.onclick = () => { modal.style.display = 'none'; };
			document.body.appendChild(modal);
		}
		return modal;
	};
	const modal = setupLightbox();
	const modalImg = document.getElementById('bb-lightbox-img');

	// --- ส่วนที่ 3: ฟังก์ชันดึงข้อมูล (Cache + Scraping) ---
	async function getTorrentDataWithCache() {
		const EXPIRY_DAYS = 30;
		const now = new Date().getTime();

		const cleanupOldCache = () => {
			for (let i = 0; i < localStorage.length; i++) {
				const key = localStorage.key(i);
				if (key.startsWith('cache_v2_')) {
					try {
						const item = JSON.parse(localStorage.getItem(key));
						if (!item.timestamp || (now - item.timestamp > EXPIRY_DAYS * 24 * 60 * 60 * 1000)) {
							localStorage.removeItem(key);
							i--;
						}
					} catch (e) { localStorage.removeItem(key); }
				}
			}
		};
		cleanupOldCache();

		// หา rows ทั้งหมดที่มีลิงก์ details.php โดยเลือกเฉพาะ tr ในสุด
		const allDetailLinks = Array.from(document.querySelectorAll('table[width="100%"] a[href*="details.php"]'));
		const torrentRows = Array.from(new Set(allDetailLinks.map(a => a.closest('tr')))).filter(Boolean);
		const detailLinks = torrentRows.map(tr => tr.querySelector('a[href*="details.php"]'));
		const results = await Promise.all(detailLinks.map(async (link, index) => {
			const detailUrl = link.href;
			const cacheKey = `cache_v2_${detailUrl}`;
			const rawData = localStorage.getItem(cacheKey);

			// ตรวจสอบ bb-dl-btn ที่มีอยู่แล้วใน list row (ไม่ต้อง fetch ถ้ามี)
			const rowEl = link.closest('tr');
			const existingDl = rowEl?.querySelector('a.bb-dl-btn, a[href*="downloadnew.php"]');

			if (rawData) {
				try {
					const item = JSON.parse(rawData);
					// อัปเดต download URL จาก list row เสมอเพื่อป้องกัน token หมดอายุ
					if (existingDl) item.download = existingDl.href;
					return item;
				} catch (e) {}
			}

			try {
				await new Promise(r => setTimeout(r, index * 50));
				const response = await fetch(detailUrl);
				const htmlText = await response.text();
				const parser = new DOMParser();
				const doc = parser.parseFromString(htmlText, 'text/html');

				let screenshot = null;
				const rowHeads = Array.from(doc.querySelectorAll('td.rowhead'));
				const targetHead = rowHeads.find(td =>
					td.textContent.includes('ScreenShot') || td.textContent.includes('Cover') || td.textContent.includes('รูปหน้าปก')
				);
				if (targetHead) {
					screenshot = targetHead.nextElementSibling.querySelector('a')?.href || targetHead.nextElementSibling.querySelector('img')?.src;
				}

				// ใช้ existingDl จาก list row ก่อน ถ้าไม่มีค่อยหาจาก detail page
				let download = existingDl ? existingDl.href : null;
				if (!download) {
					const dlImg = doc.querySelector('img[title="Download"]');
					if (dlImg && dlImg.parentElement?.tagName === 'A') {
						download = dlImg.parentElement.href;
					} else {
						// รองรับทั้ง downloadnew.php และ download.php
						const dlLink = doc.querySelector('a[href*="downloadnew.php"], a[href*="download.php"]');
						if (dlLink) download = dlLink.href;
					}
				}

				if (screenshot || download) {
					const data = { screenshot, download, timestamp: now };
					localStorage.setItem(cacheKey, JSON.stringify(data));
					return data;
				}
				// ถ้า fetch ไม่ได้ screenshot แต่มี existingDl ก็คืนค่า download ไปก่อน
				if (existingDl) return { screenshot: null, download: existingDl.href, timestamp: now };
			} catch (e) { console.error("Fetch error:", detailUrl); }
			// fallback: ใช้ existingDl ถ้ามี
			if (existingDl) return { screenshot: null, download: existingDl.href, timestamp: now };
			return null;
		}));
		return { data: results, rows: torrentRows };
	}

	// --- ส่วนที่ 4: ระบบดาวน์โหลดและ Bypass ---
	const downloadWithReferer = (url, referer) => {
		if (typeof GM_xmlhttpRequest === 'undefined') {
			alert("Error: GM_xmlhttpRequest not found!");
			return;
		}

		console.log("Priming session for:", referer);
		GM_xmlhttpRequest({
			method: "GET",
			url: referer,
			onload: function(detailsResponse) {
				let freshUrl = url;
				try {
					const doc = new DOMParser().parseFromString(detailsResponse.responseText, 'text/html');
					
					// Get fresh download link to avoid Download Guard
					const dlLink = doc.querySelector('a[href*="downloadnew.php"], a[href*="download.php"]');
					if (dlLink) {
						freshUrl = new URL(dlLink.getAttribute('href'), referer).href;
					}

					// Auto Thanks
					const thanksImg = doc.querySelector('img[title="กดขอบคุณที่นี่"]');
					if (thanksImg && thanksImg.parentElement?.tagName === 'A') {
						const thanksUrl = new URL(thanksImg.parentElement.getAttribute('href'), referer).href;
						GM_xmlhttpRequest({ method: "GET", url: thanksUrl });
						console.log("Auto-thanks sent!");
					}
				} catch (e) {
					console.error("Error parsing details page:", e);
				}

				console.log("Starting download with fresh URL:", freshUrl);
				GM_xmlhttpRequest({
					method: "GET",
					url: freshUrl,
					headers: { "Referer": referer, "User-Agent": navigator.userAgent },
					responseType: "blob",
					onload: function(response) {
						if (response.responseHeaders.toLowerCase().includes("text/html")) {
							alert("Download Guard detected! Please try again or open the details page.");
							return;
						}
						if (response.status === 200) {
							const blob = response.response;
							const downloadUrl = window.URL.createObjectURL(blob);
							const a = document.createElement("a");
							a.href = downloadUrl;
							let fileName = "file.torrent";
							const contentDisp = response.responseHeaders.split('\r\n').find(h => h.toLowerCase().startsWith('content-disposition'));
							if (contentDisp) {
								const match = contentDisp.match(/filename="?([^";]+)"?/i);
								if (match) fileName = decodeURIComponent(match[1]);
							}
							a.download = fileName;
							document.body.appendChild(a);
							a.click();
							a.remove();
							window.URL.revokeObjectURL(downloadUrl);
						}
					}
				});
			}
		});
	};

	// --- ส่วนที่ 5: เริ่มการทำงานหลัก ---
	const { data: allData, rows: torrentRows } = await getTorrentDataWithCache();

	// วนลูปตาม torrentRows (ครอบคลุมทุก row ไม่ว่า td จะมี width="900" หรือไม่)
	torrentRows.forEach((row, index) => {
		const data = allData[index];
		if (!data) return;

		// หา title cell (td ที่มีลิงก์ details.php)
		const detailLink = row.querySelector('a[href*="details.php"]');
		const td = detailLink?.closest('td');
		const detailUrl = detailLink?.href;
		if (!td || !detailUrl) return;

		// 1. จัดการคอลัมน์รูป
		const posterTd = td.previousElementSibling;
		if (posterTd && data.screenshot) {
			posterTd.style.position = "relative";
			posterTd.innerHTML = "";
			const container = document.createElement('div');
			container.style.cssText = `position: relative; width: ${settings.thumbWidth}px; height: ${settings.thumbHeight}px; margin: 0 auto; cursor: zoom-in;`;

			const link = document.createElement('a');
			link.href = data.screenshot;
			link.style.cssText = `
				display: block; width: ${settings.thumbWidth}px; height: ${settings.thumbHeight}px; overflow: hidden;
				border-radius: 6px; border: 2px solid white; box-shadow: 0 4px 6px rgba(0,0,0,0.1);
				transition: all 0.25s ease-out; background: #e2e8f0; position: relative; z-index: 1;
			`;

			const img = document.createElement('img');
			img.src = data.screenshot;
			img.style.cssText = "width: 100%; height: 100%; object-fit: cover;";
			img.onerror = () => {
				img.src = 'pic/cams.gif'; img.style.objectFit = 'contain'; img.style.padding = '10px';
				link.style.background = 'white';
			};

			link.onmouseover = () => { link.style.transform = 'scale(1.8)'; link.style.zIndex = '1000'; link.style.boxShadow = '0 20px 25px rgba(0,0,0,0.3)'; };
			link.onmouseout  = () => { link.style.transform = 'scale(1)';   link.style.zIndex = '1';    link.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)'; };
			link.onclick = (e) => { e.preventDefault(); modalImg.src = data.screenshot; modal.style.display = 'flex'; };

			link.appendChild(img);
			container.appendChild(link);
			posterTd.appendChild(container);
		}

		// 2. ปุ่ม Download Torrent — ซ่อน bb-dl-btn เดิมแล้วแทนที่ด้วยปุ่มของเรา
		if (data.download && detailUrl) {
			// ซ่อน native bb-dl-btn ถ้ามี เพื่อไม่ให้ซ้ำกัน
			row.querySelectorAll('a.bb-dl-btn').forEach(el => el.style.display = 'none');

			const dlContainer = document.createElement('div');
			dlContainer.style.marginTop = "8px";
			const btn = document.createElement('button');
			btn.type = "button";
			btn.style.cssText = `
				cursor: pointer; background: #d9534f; color: white; border: none;
				padding: 6px 16px; border-radius: 4px; font-weight: bold;
				display: flex; align-items: center; gap: 6px; transition: background 0.2s;
			`;
			btn.innerHTML = `<img src="pic/downloadpic.gif" style="width: 16px; height: 16px; filter: brightness(0) invert(1);"> Download Torrent`;
			btn.onmouseover = () => { btn.style.background = "#c9302c"; };
			btn.onmouseout  = () => { btn.style.background = "#d9534f"; };
			btn.onclick = (e) => { e.preventDefault(); downloadWithReferer(data.download, detailUrl); };
			dlContainer.appendChild(btn);
			td.insertAdjacentElement('beforeend', dlContainer);
		}
	});

	console.log("Bearbit Cover Next Initialized Successfully!");
})();
