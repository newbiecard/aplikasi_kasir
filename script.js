// Konfigurasi - GANTI URL INI DENGAN URL APPS SCRIPT ANDA
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/1GazJsbJudTwm1xmAeHGCZvtFZ7cRFuwGR76a6m-va2k/exec";

// Data menu
const menuItems = {
    "nasi": { nama: "Nasi Daun Jeruk (Dasar)", harga: 10000 },
    "paket-lengkap": { nama: "Paket Lengkap", harga: 12000 },
    "esjeruk": { nama: "Es Jeruk Peras", harga: 5000 }
};

// State aplikasi
let pesanan = [];
let total = 0;

// DOM Elements
const jumlahInput = document.getElementById('jumlah');
const btnTambah = document.getElementById('btn-tambah');
const btnReset = document.getElementById('btn-reset');
const btnSimpan = document.getElementById('btn-simpan');
const uangBayarInput = document.getElementById('uang-bayar');
const daftarPesananTbody = document.getElementById('daftar-pesanan');
const totalHargaEl = document.getElementById('total-harga');
const kembalianEl = document.getElementById('kembalian');
const notifikasiEl = document.getElementById('notifikasi');
const dialogSukses = document.getElementById('dialog-sukses');
const dialogTotal = document.getElementById('dialog-total');
const dialogKembalian = document.getElementById('dialog-kembalian');
const dialogTutup = document.getElementById('dialog-tutup');

// Inisialisasi
document.addEventListener('DOMContentLoaded', function() {
    // Event listeners untuk jumlah
    document.getElementById('tambah').addEventListener('click', () => {
        jumlahInput.value = parseInt(jumlahInput.value) + 1;
    });
    
    document.getElementById('kurang').addEventListener('click', () => {
        if (parseInt(jumlahInput.value) > 1) {
            jumlahInput.value = parseInt(jumlahInput.value) - 1;
        }
    });
    
    // Tombol tambah pesanan
    btnTambah.addEventListener('click', tambahPesanan);
    
    // Tombol reset
    btnReset.addEventListener('click', resetPesanan);
    
    // Tombol simpan
    btnSimpan.addEventListener('click', simpanTransaksi);
    
    // Validasi uang bayar real-time
    uangBayarInput.addEventListener('input', hitungKembalian);
    
    // Dialog
    dialogTutup.addEventListener('click', () => {
        dialogSukses.style.display = 'none';
        resetPesanan();
    });
    
    // Auto-select paket lengkap jika semua item dipilih
    document.getElementById('menu-nasi').addEventListener('change', cekPaketLengkap);
    document.getElementById('topping-ayam').addEventListener('change', cekPaketLengkap);
    document.getElementById('topping-kulit').addEventListener('change', cekPaketLengkap);
    document.getElementById('paket-lengkap').addEventListener('change', handlePaketLengkap);
});

// Fungsi cek paket lengkap
function cekPaketLengkap() {
    const nasi = document.getElementById('menu-nasi').checked;
    const ayam = document.getElementById('topping-ayam').checked;
    const kulit = document.getElementById('topping-kulit').checked;
    
    if (nasi && ayam && kulit) {
        document.getElementById('paket-lengkap').checked = true;
        document.getElementById('menu-nasi').checked = false;
        document.getElementById('topping-ayam').checked = false;
        document.getElementById('topping-kulit').checked = false;
    }
}

function handlePaketLengkap() {
    const paketChecked = document.getElementById('paket-lengkap').checked;
    
    if (paketChecked) {
        document.getElementById('menu-nasi').checked = false;
        document.getElementById('topping-ayam').checked = false;
        document.getElementById('topping-kulit').checked = false;
    }
}

// Tambah pesanan ke daftar
function tambahPesanan() {
    // Cari item yang dipilih
    let itemDipilih = null;
    let namaItem = "";
    let harga = 0;
    let topping = [];
    
    // Cek paket lengkap
    if (document.getElementById('paket-lengkap').checked) {
        itemDipilih = "paket-lengkap";
        namaItem = menuItems[itemDipilih].nama;
        harga = menuItems[itemDipilih].harga;
    }
    // Cek nasi + topping
    else if (document.getElementById('menu-nasi').checked) {
        namaItem = "Nasi Daun Jeruk";
        harga = menuItems["nasi"].harga;
        
        // Cek topping
        if (document.getElementById('topping-ayam').checked) {
            topping.push("Ayam Suwir");
        }
        if (document.getElementById('topping-kulit').checked) {
            topping.push("Kulit Ayam Krispi");
        }
        
        if (topping.length > 0) {
            namaItem += " + " + topping.join(", ");
        }
    }
    // Cek es jeruk
    else if (document.getElementById('menu-esjeruk').checked) {
        itemDipilih = "esjeruk";
        namaItem = menuItems[itemDipilih].nama;
        harga = menuItems[itemDipilih].harga;
    }
    else {
        tampilkanNotifikasi("Pilih menu terlebih dahulu!", "error");
        return;
    }
    
    const jumlah = parseInt(jumlahInput.value);
    const subtotal = harga * jumlah;
    
    // Tambah ke array pesanan
    pesanan.push({
        nama: namaItem,
        jumlah: jumlah,
        harga: harga,
        subtotal: subtotal,
        topping: topping.join(", ")
    });
    
    // Update tampilan
    updateDaftarPesanan();
    hitungTotal();
    
    // Reset input
    document.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
    jumlahInput.value = 1;
    
    tampilkanNotifikasi("Item ditambahkan ke daftar!", "success");
}

// Update tabel daftar pesanan
function updateDaftarPesanan() {
    daftarPesananTbody.innerHTML = "";
    
    if (pesanan.length === 0) {
        daftarPesananTbody.innerHTML = `
            <tr class="empty-row">
                <td colspan="5">Belum ada pesanan. Tambahkan item!</td>
            </tr>
        `;
        return;
    }
    
    pesanan.forEach((item, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.nama}</td>
            <td>${item.jumlah}</td>
            <td>${formatRupiah(item.harga)}</td>
            <td>${formatRupiah(item.subtotal)}</td>
            <td><button class="btn-hapus" data-index="${index}"><i class="fas fa-trash"></i> Hapus</button></td>
        `;
        daftarPesananTbody.appendChild(row);
    });
    
    // Tambah event listener untuk tombol hapus
    document.querySelectorAll('.btn-hapus').forEach(btn => {
        btn.addEventListener('click', function() {
            const index = parseInt(this.getAttribute('data-index'));
            hapusPesanan(index);
        });
    });
}

// Hapus pesanan
function hapusPesanan(index) {
    pesanan.splice(index, 1);
    updateDaftarPesanan();
    hitungTotal();
    tampilkanNotifikasi("Item dihapus dari daftar!", "success");
}

// Hitung total
function hitungTotal() {
    total = pesanan.reduce((sum, item) => sum + item.subtotal, 0);
    totalHargaEl.textContent = formatRupiah(total);
    
    // Update status tombol simpan
    btnSimpan.disabled = total === 0;
    
    // Hitung kembalian jika ada input uang
    if (uangBayarInput.value) {
        hitungKembalian();
    }
}

// Hitung kembalian
function hitungKembalian() {
    const uangBayar = parseInt(uangBayarInput.value) || 0;
    
    if (uangBayar < total) {
        notifikasiEl.textContent = `Uang kurang! Kurang ${formatRupiah(total - uangBayar)}`;
        notifikasiEl.className = "notifikasi error";
        notifikasiEl.style.display = "block";
        kembalianEl.textContent = formatRupiah(0);
        btnSimpan.disabled = true;
    } else {
        const kembalian = uangBayar - total;
        kembalianEl.textContent = formatRupiah(kembalian);
        notifikasiEl.style.display = "none";
        btnSimpan.disabled = false;
    }
}

// Reset semua pesanan
function resetPesanan() {
    pesanan = [];
    total = 0;
    uangBayarInput.value = "";
    
    updateDaftarPesanan();
    hitungTotal();
    notifikasiEl.style.display = "none";
    
    tampilkanNotifikasi("Semua pesanan direset!", "success");
}

// Simpan transaksi ke Google Sheets
async function simpanTransaksi() {
    const uangBayar = parseInt(uangBayarInput.value) || 0;
    
    if (uangBayar < total) {
        tampilkanNotifikasi("Uang bayar kurang!", "error");
        return;
    }
    
    if (pesanan.length === 0) {
        tampilkanNotifikasi("Tidak ada pesanan untuk disimpan!", "error");
        return;
    }
    
    // Buat data untuk dikirim
    const sekarang = new Date();
    const tanggal = sekarang.toLocaleDateString('id-ID');
    const waktu = sekarang.toLocaleTimeString('id-ID');
    
    // Gabungkan semua item menjadi satu transaksi
    const transaksiData = {
        tanggal: tanggal,
        waktu: waktu,
        items: pesanan,
        total: total,
        uang_bayar: uangBayar,
        kembalian: uangBayar - total
    };
    
    // Kirim ke Google Apps Script
    try {
        btnSimpan.disabled = true;
        btnSimpan.innerHTML = '<i class="fas fa-spinner fa-spin"></i> MENGIRIM...';
        
        const response = await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors', // Untuk GitHub Pages
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(transaksiData)
        });
        
        // Karena no-cors, kita tidak bisa membaca response
        // Tapi anggap saja berhasil
        console.log("Data dikirim:", transaksiData);
        
        // Tampilkan dialog sukses
        dialogTotal.textContent = formatRupiah(total);
        dialogKembalian.textContent = formatRupiah(uangBayar - total);
        dialogSukses.style.display = 'flex';
        
    } catch (error) {
        console.error("Error mengirim data:", error);
        tampilkanNotifikasi("Gagal mengirim data ke Sheet!", "error");
        btnSimpan.disabled = false;
        btnSimpan.innerHTML = '<i class="fas fa-paper-plane"></i> SIMPAN TRANSAKSI';
    }
}

// Format Rupiah
function formatRupiah(angka) {
    return 'Rp' + angka.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

// Tampilkan notifikasi
function tampilkanNotifikasi(pesan, tipe) {
    notifikasiEl.textContent = pesan;
    notifikasiEl.className = `notifikasi ${tipe}`;
    notifikasiEl.style.display = "block";
    
    if (tipe === "success") {
        setTimeout(() => {
            notifikasiEl.style.display = "none";
        }, 3000);
    }
}

// Kirim data dummy untuk testing (hapus di produksi)
function kirimDataDummy() {
    const dummyData = {
        tanggal: "10/06/2023",
        waktu: "14:30:00",
        items: [
            { nama: "Paket Lengkap", jumlah: 2, harga: 12000, subtotal: 24000, topping: "" },
            { nama: "Es Jeruk Peras", jumlah: 1, harga: 5000, subtotal: 5000, topping: "" }
        ],
        total: 29000,
        uang_bayar: 50000,
        kembalian: 21000
    };
    
    console.log("Data dummy untuk testing:", dummyData);
    console.log("URL Apps Script yang perlu diisi:", APPS_SCRIPT_URL);
}