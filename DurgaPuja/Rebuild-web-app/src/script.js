// Global Variables
// Add this safe fallback block to the absolute top of script.js (Line 1)
let currentLanguage = localStorage.getItem('preferredLanguage') || 'en';
let currentTheme = localStorage.getItem('preferredTheme') || 'light';
let userLocation = null;
let isTracking = false;
let map = null;
let currentFilter = 'all';
let watchId = null;

// App State
class AppState {
    constructor() {
        this.visited = JSON.parse(localStorage.getItem('visitedPandals')) || [];
        this.bookmarked = JSON.parse(localStorage.getItem('bookmarkedPandals')) || [];
        this.points = parseInt(localStorage.getItem('userPoints')) || 0;
        this.badges = JSON.parse(localStorage.getItem('userBadges')) || [];
        this.routes = JSON.parse(localStorage.getItem('userRoutes')) || [];
    }

    save() {
        localStorage.setItem('visitedPandals', JSON.stringify(this.visited));
        localStorage.setItem('bookmarkedPandals', JSON.stringify(this.bookmarked));
        localStorage.setItem('userPoints', this.points.toString());
        localStorage.setItem('userBadges', JSON.stringify(this.badges));
        localStorage.setItem('userRoutes', JSON.stringify(this.routes));
        window.__appState = this;
        window.dispatchEvent(new CustomEvent('appstate-saved', { detail: this }));
    }
}

let appState = new AppState();

// Pandal Data with Bengali names
const pandalData = [
    // Heritage Pandals
    { id: 'tala-prattoy', name: 'Tala Prattoy', nameBn: 'তালা প্রত্যয়', type: 'heritage', area: 'Tala', areaBn: 'তালা', lat: 22.608846, lng: 88.382502, theme: 'Traditional Bengali Architecture', themeBn: 'ঐতিহ্যবাহী বাঙালি স্থাপত্য', hours: '6 AM - 11 PM', transport: '2.5 km from Dum Dum Metro', crowd: 'medium', accessible: false },
    { id: 'kumartuli-sarbojanin', name: 'Kumartuli Sarbojanin', nameBn: 'কুমারটুলি সর্বজনীন', type: 'heritage', area: 'Kumartuli', areaBn: 'কুমারটুলি', lat: 22.599058253797256, lng: 88.36145439677378, theme: 'Clay Artist Heritage', themeBn: 'মৃৎশিল্পীদের ঐতিহ্য', hours: '5 AM - 11 PM', transport: 'Near Sovabazar Metro', crowd: 'high', accessible: false },
    { id: 'baghbazar-sarbojanin', name: 'Baghbazar Sarbojanin', nameBn: 'বাগবাজার সর্বজনীন', type: 'heritage', area: 'Baghbazar', areaBn: 'বাগবাজার', lat: 22.604667910075644, lng: 88.36562569985544, theme: 'Traditional Pandal Art', themeBn: 'ঐতিহ্যবাহী পণ্ডেল শিল্প', hours: '6 AM - 11 PM', transport: 'Shyambazar Metro', crowd: 'medium', accessible: true },
    { id: 'sovabazar-rajbari', name: 'Sovabazar Rajbari', nameBn: 'শোভাবাজার রাজবাড়ি', type: 'heritage', area: 'Sovabazar', areaBn: 'শোভাবাজার', lat: 22.596048876948696, lng: 88.36721188946015, theme: 'Royal Heritage', themeBn: 'রাজকীয় ঐতিহ্য', hours: '6 AM - 10 PM', transport: 'Sovabazar Metro', crowd: 'low', accessible: false },
    { id: 'shyambazar-nabadurga', name: 'Shyambazar Nabadurga', nameBn: 'শ্যামবাজার নবদুর্গা', type: 'heritage', area: 'Shyambazar', areaBn: 'শ্যামবাজার', lat: 22.5989, lng: 88.3731, theme: 'Ancient Traditions', themeBn: 'প্রাচীন ঐতিহ্য', hours: '5 AM - 11 PM', transport: 'Shyambazar Metro', crowd: 'high', accessible: true },
    { id: 'jorasanko-thakur-bari', name: 'Jorasanko Thakur Bari', nameBn: 'জোড়াসাঁকো ঠাকুরবাড়ি', type: 'heritage', area: 'Jorasanko', areaBn: 'জোড়াসাঁকো', lat: 22.585103506532562, lng: 88.3591643226664, theme: 'Tagore Family Heritage', themeBn: 'ঠাকুর পরিবারের ঐতিহ্য', hours: '6 AM - 10 PM', transport: 'Girish Park Metro', crowd: 'medium', accessible: false },
    { id: 'college-square', name: 'College Square', nameBn: 'কলেজ স্কোয়ার', type: 'heritage', area: 'College Street', areaBn: 'কলেজ স্ট্রিট', lat: 22.574666574660924, lng: 88.36444020917365, theme: 'Educational Heritage', themeBn: 'শিক্ষার ঐতিহ্য', hours: '6 AM - 12 AM', transport: 'College Street', crowd: 'medium', accessible: true },
    { id: 'hatibagan-nabin-palli', name: 'Hatibagan Nabin Palli', nameBn: 'হাতিবাগান নবীন পল্লী', type: 'heritage', area: 'Hatibagan', areaBn: 'হাতিবাগান', lat: 22.594535337634657, lng: 88.37201415600829, theme: 'Traditional Craftsmanship', themeBn: 'ঐতিহ্যবাহী কারুকাজ', hours: '6 AM - 11 PM', transport: 'Shyambazar area', crowd: 'medium', accessible: false },

    // Community Pandals
    { id: 'dum-dum-tarun-sangha', name: 'Dum Dum Tarun Sangha', nameBn: 'দমদম তরুণ সংঘ', type: 'community', area: 'Dum Dum', areaBn: 'দমদম', lat: 22.611150114746334, lng: 88.41388348657216, theme: 'Community Celebration', themeBn: 'কমিউনিটি উৎসব', hours: '6 AM - 12 AM', transport: 'Dum Dum Metro', crowd: 'high', accessible: true },
    { id: 'lake-town-adhibasi-brinda', name: 'Lake Town Adhibasi Brinda', nameBn: 'লেক টাউন আদিবাসী বৃন্দ', type: 'community', area: 'Lake Town', areaBn: 'লেক টাউন', lat: 22.604629063063634, lng: 88.40397009568207, theme: 'Tribal Culture', themeBn: 'উপজাতীয় সংস্কৃতি', hours: '6 AM - 11 PM', transport: 'Lake Town', crowd: 'medium', accessible: true },
    { id: 'salt-lake-fd-block', name: 'Salt Lake FD Block', nameBn: 'সল্ট লেক এফডি ব্লক', type: 'community', area: 'Salt Lake', areaBn: 'সল্ট লেক', lat: 22.58371511476005, lng: 88.41226667452867, theme: 'Modern Community', themeBn: 'আধুনিক কমিউনিটি', hours: '6 AM - 12 AM', transport: 'Salt Lake Stadium', crowd: 'high', accessible: true },
    { id: 'belgachia-club', name: 'Belgachia Club', nameBn: 'বেলগাছিয়া ক্লাব', type: 'community', area: 'Belgachia', areaBn: 'বেলগাছিয়া', lat: 22.605685067219326, lng: 88.3235694456533, theme: 'Local Community Spirit', themeBn: 'স্থানীয় কমিউনিটির চেতনা', hours: '6 AM - 11 PM', transport: 'Belgachia area', crowd: 'medium', accessible: false },
    { id: 'madhyamgram-chhatri-sangha', name: 'Madhyamgram Chhatri Sangha', nameBn: 'মধ্যমগ্রাম ছাত্রী সংঘ', type: 'community', area: 'Madhyamgram', areaBn: 'মধ্যমগ্রাম', lat: 22.6700, lng: 88.4600, theme: 'Student Community', themeBn: 'ছাত্র কমিউনিটি', hours: '6 AM - 11 PM', transport: 'Madhyamgram Station', crowd: 'medium', accessible: false },
    { id: 'barasat-sarbojanin', name: 'Barasat Sarbojanin', nameBn: 'বারাসাত সর্বজনীন', type: 'community', area: 'Barasat', areaBn: 'বারাসাত', lat: 22.7200, lng: 88.4800, theme: 'Rural Community', themeBn: 'গ্রামীণ কমিউনিটি', hours: '5 AM - 11 PM', transport: 'Barasat Station', crowd: 'high', accessible: false },

    // Theme Pandals
    { id: 'sree-bhumi-sporting-club', name: 'Sree Bhumi Sporting Club', nameBn: 'শ্রীভূমি স্পোর্টিং ক্লাব', type: 'theme', area: 'Dum Dum', areaBn: 'দমদম', lat: 22.600473996675507, lng:  88.40264529965181, theme: 'Grand Spectacular Theme', themeBn: 'মহান দর্শনীয় থিম', hours: '24 Hours', transport: 'Dum Dum Metro', crowd: 'high', accessible: false },
    { id: 'santosh-mitra-square', name: 'Santosh Mitra Square', nameBn: 'সন্তোষ মিত্র স্কোয়ার', type: 'theme', area: 'Central Kolkata', areaBn: 'মধ্য কলকাতা', lat: 22.566206670311463, lng:  88.36565080732241, theme: 'Modern Art Installation', themeBn: 'আধুনিক শিল্প ইনস্টলেশন', hours: '6 AM - 12 AM', transport: 'Central Metro', crowd: 'medium', accessible: true },
    { id: 'triangular-park', name: 'Triangular Park', nameBn: 'ত্রিভুজাকার পার্ক', type: 'theme', area: 'Gariahat', areaBn: 'গড়িয়াহাট', lat: 22.517767387211045, lng: 88.35890325206616, theme: 'Contemporary Design', themeBn: 'সমসাময়িক ডিজাইন', hours: '6 AM - 12 AM', transport: 'Gariahat Metro', crowd: 'high', accessible: true },

    // Additional pandals to reach 31 total
    { id: 'girish-park-sarbojanin', name: 'Girish Park Sarbojanin', nameBn: 'গিরিশ পার্ক সর্বজনীন', type: 'community', area: 'Girish Park', areaBn: 'গিরিশ পার্ক', lat: 22.5800, lng: 88.3600, theme: 'Theatre Community', themeBn: 'নাট্য কমিউনিটি', hours: '6 AM - 11 PM', transport: 'Girish Park Metro', crowd: 'medium', accessible: false },
    { id: 'mg-road-durgotsab', name: 'MG Road Durgotsab', nameBn: 'এমজি রোড দুর্গোৎসব', type: 'heritage', area: 'MG Road', areaBn: 'এমজি রোড', lat: 22.586598335674434, lng: 88.36239486887767, theme: 'Commercial Heritage', themeBn: 'বাণিজ্যিক ঐতিহ্য', hours: '6 AM - 12 AM', transport: 'Central Metro', crowd: 'high', accessible: true },
    { id: 'ahiritola-sarbojanin', name: 'Ahiritola Sarbojanin', nameBn: 'আহিরিটোলা সর্বজনীন', type: 'heritage', area: 'Ahiritola', areaBn: 'আহিরিটোলা', lat: 22.59510885849594, lng: 88.35721408033837, theme: 'River Ghat Heritage', themeBn: 'নদীর ঘাটের ঐতিহ্য', hours: '5 AM - 11 PM', transport: 'Near Bagbazar Ghat', crowd: 'medium', accessible: false },
    { id: 'chitpur-sarbojanin', name: 'Chitpur Sarbojanin', nameBn: 'চিৎপুর সর্বজনীন', type: 'heritage', area: 'Chitpur', areaBn: 'চিৎপুর', lat: 22.5950, lng: 88.3800, theme: 'Traditional North Kolkata', themeBn: 'ঐতিহ্যবাহী উত্তর কলকাতা', hours: '6 AM - 11 PM', transport: 'Chitpur area', crowd: 'medium', accessible: true },
    { id: 'sinthi-sarbojanin', name: 'Sinthi Sarbojanin', nameBn: 'সিন্থি সর্বজনীন', type: 'community', area: 'Sinthi', areaBn: 'সিন্থি', lat: 22.627251854893327, lng: 88.38964196684697, theme: 'Riverside Community', themeBn: 'নদীর পাড়ের কমিউনিটি', hours: '6 AM - 11 PM', transport: 'Sinthi area', crowd: 'medium', accessible: false },
    { id: 'agarpara-sarbojanin', name: 'Agarpara Sarbojanin', nameBn: 'আগরপাড়া সর্বজনীন', type: 'community', area: 'Agarpara', areaBn: 'আগরপাড়া', lat: 22.6400, lng: 88.3700, theme: 'Industrial Community', themeBn: 'শিল্প কমিউনিটি', hours: '6 AM - 11 PM', transport: 'Agarpara Station', crowd: 'low', accessible: false },
    { id: 'jessore-road-sarbojanin', name: 'Jessore Road Sarbojanin', nameBn: 'যশোর রোড সর্বজনীন', type: 'community', area: 'Jessore Road', areaBn: 'যশোর রোড', lat: 22.6400, lng: 88.4200, theme: 'Highway Community', themeBn: 'হাইওয়ে কমিউনিটি', hours: '6 AM - 11 PM', transport: 'Jessore Road', crowd: 'medium', accessible: false },
    { id: 'airport-gate-sarbojanin', name: 'Airport Gate Sarbojanin', nameBn: 'বিমানবন্দর গেট সর্বজনীন', type: 'community', area: 'Airport', areaBn: 'বিমানবন্দর', lat: 22.6500, lng: 88.4500, theme: 'Aviation Community', themeBn: 'বিমান চলাচল কমিউনিটি', hours: '6 AM - 11 PM', transport: 'Airport area', crowd: 'medium', accessible: true },
    { id: 'pathuriaghata-ghosh-bari', name: 'Pathuriaghata Ghosh Bari', nameBn: 'পাথুরিয়াঘাটা ঘোষ বাড়ি', type: 'heritage', area: 'Pathuriaghata', areaBn: 'পাথুরিয়াঘাটা', lat: 22.5900, lng: 88.3600, theme: 'Zamindari Heritage', themeBn: 'জমিদারি ঐতিহ্য', hours: '6 AM - 10 PM', transport: 'Central Metro', crowd: 'low', accessible: false },
    { id: 'beadon-street', name: 'Beadon Street', nameBn: 'বিডন স্ট্রিট', type: 'heritage', area: 'Beadon Street', areaBn: 'বিডন স্ট্রিট', lat: 22.58934992539946, lng: 88.36758110917404, theme: 'Colonial Heritage', themeBn: 'ঔপনিবেশিক ঐতিহ্য', hours: '6 AM - 11 PM', transport: 'Central Kolkata', crowd: 'low', accessible: false },
    { id: 'rajarhat-new-town', name: 'Rajarhat New Town', nameBn: 'রাজারহাট নিউ টাউন', type: 'community', area: 'New Town', areaBn: 'নিউ টাউন', lat: 22.584334183757967, lng: 88.45919232199338, theme: 'Modern Township', themeBn: 'আধুনিক টাউনশিপ', hours: '6 AM - 12 AM', transport: 'New Town area', crowd: 'high', accessible: true },
    { id: 'baguiati-sporting', name: 'Baguiati Sporting', nameBn: 'বাগুইআটি স্পোর্টিং', type: 'community', area: 'Baguiati', areaBn: 'বাগুইআটি', lat: 22.6300, lng: 88.4400, theme: 'Sports Community', themeBn: 'ক্রীড়া কমিউনিটি', hours: '6 AM - 11 PM', transport: 'Baguiati area', crowd: 'medium', accessible: false },
    { id: 'dakshineswar-ramkrishna-sangha', name: 'Dakshineswar Ramkrishna Sangha', nameBn: 'দক্ষিণেশ্বর রামকৃষ্ণ সংঘ', type: 'community', area: 'Dakshineswar', areaBn: 'দক্ষিণেশ্বর', lat: 22.6550, lng: 88.3580, theme: 'Spiritual Community', themeBn: 'আধ্যাত্মিক কমিউনিটি', hours: '5 AM - 10 PM', transport: 'Dakshineswar Metro', crowd: 'high', accessible: false },
    { id: 'nager-bazaar-sarbojanin', name: 'Nager Bazaar Sarbojanin', nameBn: 'নগর বাজার সর্বজনীন', type: 'community', area: 'Nager Bazaar', areaBn: 'নগর বাজার', lat: 22.605626765853383, lng: 88.37011305699241, theme: 'Market Community', themeBn: 'বাজার কমিউনিটি', hours: '6 AM - 11 PM', transport: 'Nager Bazaar Metro', crowd: 'medium', accessible: false }
];

// Food Data
const foodData = [
    { name: 'Kathi Roll', nameBn: 'কাঠি রোল', type: 'street', location: 'Nizam\'s, New Market', locationBn: 'নিজাম, নিউ মার্কেট', rating: 4.8, price: '₹80 - ₹120', lat: 22.5726, lng: 88.3639 },
    { name: 'Rasgulla', nameBn: 'রসগোল্লা', type: 'sweets', location: 'KC Das, Esplanade', locationBn: 'কেসি দাস, এসপ্ল্যানেড', rating: 4.9, price: '₹15 - ₹25 per piece', lat: 22.5726, lng: 88.3639 },
    { name: 'Phuchka', nameBn: 'ফুচকা', type: 'street', location: 'College Street Corner', locationBn: 'কলেজ স্ট্রিট কর্নার', rating: 4.2, price: '₹30 - ₹50', lat: 22.5726, lng: 88.3639 },
    { name: 'Fish Curry & Rice', nameBn: 'মাছের ঝোল ভাত', type: 'traditional', location: 'Bhojohori Manna, Shyambazar', locationBn: 'ভোজোহরি মান্না, শ্যামবাজার', rating: 4.6, price: '₹200 - ₹350', lat: 22.5989, lng: 88.3731 },
    { name: 'Sandesh', nameBn: 'সন্দেশ', type: 'sweets', location: 'Girish Chandra Dey, Bagbazar', locationBn: 'গিরীশচন্দ্র দে, বাগবাজার', rating: 4.7, price: '₹20 - ₹40 per piece', lat: 22.5900, lng: 88.3700 },
    { name: 'Kheer', nameBn: 'ক্ষীর', type: 'traditional', location: 'Paramount, Shyama Charan Street', locationBn: 'প্যারামাউন্ট, শ্যামাচরণ স্ট্রিট', rating: 4.3, price: '₹60 - ₹100', lat: 22.5700, lng: 88.3650 },
    { name: 'Jhal Muri', nameBn: 'ঝালমুড়ি', type: 'street', location: 'Victoria Memorial Area', locationBn: 'ভিক্টোরিয়া মেমোরিয়াল এলাকা', rating: 4.0, price: '₹20 - ₹40', lat: 22.5448, lng: 88.3426 },
    { name: 'Mishti Doi', nameBn: 'মিষ্টি দই', type: 'sweets', location: 'Banchharam, Taltala', locationBn: 'বাঁচারাম, তালতলা', rating: 4.5, price: '₹30 - ₹50', lat: 22.5726, lng: 88.3639 },
    { name: 'Biryani', nameBn: 'বিরিয়ানি', type: 'restaurants', location: 'Arsalan, Park Circus', locationBn: 'আর্সালান, পার্ক সার্কাস', rating: 4.8, price: '₹300 - ₹500', lat: 22.5448, lng: 88.3735 },
    { name: 'Kosha Mangsho', nameBn: 'কষা মাংস', type: 'restaurants', location: 'Peter Cat, Park Street', locationBn: 'পিটার ক্যাট, পার্ক স্ট্রিট', rating: 4.7, price: '₹400 - ₹600', lat: 22.5448, lng: 88.3637 },
    { name: 'Luchi Alur Dom', nameBn: 'লুচি আলুর দম', type: 'traditional', location: 'Kewpie\'s, Elgin Road', locationBn: 'কিউপিজ, এলগিন রোড', rating: 4.4, price: '₹150 - ₹250', lat: 22.5448, lng: 88.3637 },
    { name: 'Chingri Malai Curry', nameBn: 'চিংড়ি মালাই কারি', type: 'restaurants', location: 'Oh! Calcutta, Forum Mall', locationBn: 'ওহ! ক্যালকাটা, ফোরাম মল', rating: 4.6, price: '₹500 - ₹800', lat: 22.5448, lng: 88.3637 }
];
// Theme Archive
function showThemeArchive() {
    openModal('themeArchiveModal');
    closeSideMenu();
}

function showThemeDetails(year) {
    const themes = {
        2024: {
            title: 'Save Our Planet',
            description: 'Environmental conservation and climate change awareness through traditional art.',
            details: 'Pandals featured recycled materials, solar power, and eco-friendly decorations.'
        },
        2023: {
            title: 'Unity in Diversity',
            description: 'Celebrating India\'s multicultural heritage and unity.',
            details: 'Showcased different states\' cultures integrated with Bengali traditions.'
        },
        2022: {
            title: 'Tribute to Healthcare Workers',
            description: 'Honoring COVID-19 frontline warriors and medical professionals.',
            details: 'Many pandals featured hospital themes and healthcare worker tributes.'
        },
        2021: {
            title: 'Hope Amidst Crisis',
            description: 'Representing resilience and hope during pandemic times.',
            details: 'Smaller celebrations with focus on community support and solidarity.'
        },
        2020: {
            title: 'Simplified Celebration',
            description: 'COVID-19 restrictions led to smaller, community-focused celebrations.',
            details: 'First year with major restrictions, virtual darshan became popular.'
        },
        2019: {
            title: 'Bengali Heritage Revival',
            description: 'Showcasing traditional Bengali art, culture, and mythology.',
            details: 'Focus on preserving and promoting traditional Bengali craftsmanship.'
        }
    };

    const theme = themes[year];
    if (theme) {
        alert(`${year} Theme: ${theme.title}\n\n${theme.description}\n\n${theme.details}`);
    }
}

// Initialize App
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    // Hide preloader after 3 seconds
    setTimeout(() => {
        const preloader = document.getElementById('preloader');
        if (preloader) {
            preloader.classList.add('hide');
        }
    }, 3000);

    // Initialize components
    updateClock();
    setInterval(updateClock, 1000);
    updateLanguage();
    generatePandalCards();
    generateFoodCards();
    updateProgress();
    updateStats();
    setupEventListeners();

    // Set initial theme
    document.body.setAttribute('data-theme', currentTheme);
    const themeIcon = document.getElementById('themeIcon');
    if (themeIcon) {
        themeIcon.className = currentTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }
    const langText = document.getElementById('langText');
    if (langText) {
        langText.textContent = currentLanguage === 'en' ? 'বাং' : 'Eng';
    }
}

// Clock Function
function updateClock() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', {
        hour12: true,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    const clockElement = document.getElementById('live-clock');
    if (clockElement) {
        clockElement.textContent = timeString;
    }
}

// Event Listeners
function setupEventListeners() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', handleSearch);
    }

    const foodSearchInput = document.getElementById('foodSearchInput');
    if (foodSearchInput) {
        foodSearchInput.addEventListener('input', handleFoodSearch);
    }

    const overlay = document.getElementById('sideMenuOverlay');
    if (overlay) {
        overlay.addEventListener('click', closeSideMenu);
    }

    // Add keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeAllModals();
        }
    });
}

// Duplicate 1 (Line ~167)
function toggleSideMenu() {
    const menu = document.getElementById('sideMenu');
    const overlay = document.getElementById('sideMenuOverlay');
}

// Duplicate 2 (Absolute Bottom of the File)
function toggleSideMenu() {
    const sideMenu = document.getElementById('sideMenu');
    const overlay = document.querySelector('.side-menu-overlay');
}

function updateLanguage() {
    const elements = document.querySelectorAll('[data-' + currentLanguage + ']');
    elements.forEach(element => {
        element.textContent = element.getAttribute('data-' + currentLanguage);
    });

    const placeholders = document.querySelectorAll('[data-placeholder-' + currentLanguage + ']');
    placeholders.forEach(element => {
        element.placeholder = element.getAttribute('data-placeholder-' + currentLanguage);
    });
}

// Navigation
function showSection(sectionId) {
    // Hide all sections
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });

    // Remove active from all tabs
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.classList.remove('active');
    });

    // Show selected section
    const section = document.getElementById(sectionId);
    if (section) {
        section.classList.add('active');
    }

    // Activate corresponding tab
    const clickedTab = event?.target?.closest('.nav-tab');
    if (clickedTab) {
        clickedTab.classList.add('active');
    }

    // Initialize map if map section is selected
    if (sectionId === 'map') {
        setTimeout(initializeMap, 100);
    }
}

// Side Menu Functions
function toggleSideMenu() {
    const menu = document.getElementById('sideMenu');
    const overlay = document.getElementById('sideMenuOverlay');

    if (menu && overlay) {
        menu.classList.toggle('open');
        overlay.classList.toggle('active');
    }
}

function closeSideMenu() {
    const menu = document.getElementById('sideMenu');
    const overlay = document.getElementById('sideMenuOverlay');

    if (menu) menu.classList.remove('open');
    if (overlay) overlay.classList.remove('active');
}

// Generate Pandal Cards
function generatePandalCards() {
    const grid = document.getElementById('pandalGrid');
    if (!grid) return;

    grid.innerHTML = '';

    pandalData.forEach(pandal => {
        const card = createPandalCard(pandal);
        grid.appendChild(card);
    });

    updateStats();
}

function createPandalCard(pandal) {
    const div = document.createElement('div');
    const isBookmarked = appState.bookmarked.includes(pandal.id);
    const isVisited = appState.visited.includes(pandal.id);

    div.className = `pandal-card ${isVisited ? 'visited' : ''}`;
    div.setAttribute('data-type', pandal.type);
    div.setAttribute('data-name', pandal.name.toLowerCase());
    div.setAttribute('data-location', pandal.area.toLowerCase());
    div.setAttribute('data-accessible', pandal.accessible);
    div.setAttribute('data-id', pandal.id);

    const crowdClass = `crowd-${pandal.crowd}`;
    const crowdText = pandal.crowd.charAt(0).toUpperCase() + pandal.crowd.slice(1);

    const displayName = currentLanguage === 'bn' ? pandal.nameBn : pandal.name;
    const displayArea = currentLanguage === 'bn' ? pandal.areaBn : pandal.area;
    const displayTheme = currentLanguage === 'bn' ? pandal.themeBn : pandal.theme;

    // Add distance info if user location is available
    let distanceHTML = '';
    if (userLocation) {
        const distance = calculateDistance(userLocation.lat, userLocation.lng, pandal.lat, pandal.lng);
        distanceHTML = `<div class="distance-info"> ${distance.toFixed(1)} km away</div>`;
    }

    div.innerHTML = `
                ${distanceHTML}
                <div class="crowd-indicator ${crowdClass}">${crowdText}</div>
                <div class="pandal-name">${displayName}</div>
                <div class="pandal-type">${pandal.type.charAt(0).toUpperCase() + pandal.type.slice(1)}</div>
                <div class="pandal-details">
                    <div class="detail-item">
                        <i class="fas fa-map-marker-alt detail-icon"></i>
                        <span>${displayArea}</span>
                    </div>
                    <div class="detail-item">
                        <i class="fas fa-palette detail-icon"></i>
                        <span>${displayTheme}</span>
                    </div>
                    <div class="detail-item">
                        <i class="fas fa-clock detail-icon"></i>
                        <span>${pandal.hours}</span>
                    </div>
                    <div class="detail-item">
                        <i class="fas fa-subway detail-icon"></i>
                        <span>${pandal.transport}</span>
                    </div>
                    ${pandal.accessible ? `
                        <div class="detail-item">
                            <i class="fas fa-wheelchair detail-icon"></i>
                            <span>Wheelchair Accessible</span>
                        </div>
                    ` : ''}
                </div>
                <div style="margin-top: 1rem;">
                    <button class="btn ${isBookmarked ? 'bookmarked' : ''}" onclick="toggleBookmark('${pandal.id}')">
                        <i class="fas fa-heart"></i>
                        <span>${isBookmarked ? 'Bookmarked' : 'Bookmark'}</span>
                    </button>
                    <button class="btn ${isVisited ? 'visited-btn' : ''}" onclick="markVisited('${pandal.id}')">
                        <i class="fas fa-${isVisited ? 'check-circle' : 'check'}"></i>
                        <span>${isVisited ? 'Visited' : 'Mark Visited'}</span>
                    </button>
                    <button class="btn" onclick="openGoogleMaps(${pandal.lat}, ${pandal.lng}, '${pandal.name}')">
                        <i class="fas fa-directions"></i>
                        <span>Directions</span>
                    </button>
                </div>
            `;

    return div;
}

// Generate Food Cards
function generateFoodCards() {
    const grid = document.getElementById('foodGrid');
    if (!grid) return;

    grid.innerHTML = '';

    foodData.forEach(food => {
        const card = createFoodCard(food);
        grid.appendChild(card);
    });
}

function createFoodCard(food) {
    const div = document.createElement('div');
    div.className = 'food-card';
    div.setAttribute('data-type', food.type);

    const displayName = currentLanguage === 'bn' ? food.nameBn : food.name;
    const displayLocation = currentLanguage === 'bn' ? food.locationBn : food.location;

    const stars = '★'.repeat(Math.floor(food.rating)) + '☆'.repeat(5 - Math.floor(food.rating));

    div.innerHTML = `
                <h4>${displayName}</h4>
                <div class="food-rating">
                    <span style="color: var(--gold);">${stars}</span>
                    <span>${food.rating}/5</span>
                </div>
                <div class="detail-item">
                    <span class="detail-icon"> </span>
                    <span>${displayLocation}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-icon"> </span>
                    <span>${food.price}</span>
                </div>
                <button class="btn" onclick="openGoogleMaps(${food.lat}, ${food.lng}, '${food.location}')">
                    <i class="fas fa-directions"></i>
                    <span data-en="Get Directions" data-bn="নির্দেশাবলী পান">Get Directions</span>
                </button>
            `;

    return div;
}

// Filter Functions
function filterPandals(type) {
    currentFilter = type;
    const cards = document.querySelectorAll('.pandal-card');
    const filterBtns = document.querySelectorAll('#pandals .filter-btn');

    // Update filter button states
    filterBtns.forEach(btn => btn.classList.remove('active'));
    if (event && event.target) {
        event.target.classList.add('active');
    }

    let visibleCount = 0;

    cards.forEach(card => {
        const cardType = card.getAttribute('data-type');
        const cardId = card.getAttribute('data-id');
        const isAccessible = card.getAttribute('data-accessible') === 'true';

        let shouldShow = false;

        switch(type) {
            case 'all':
                shouldShow = true;
                break;
            case 'accessible':
                shouldShow = isAccessible;
                break;
            case 'bookmarked':
                shouldShow = appState.bookmarked.includes(cardId);
                break;
            default:
                shouldShow = cardType === type;
        }

        if (shouldShow) {
            card.style.display = 'block';
            visibleCount++;
        } else {
            card.style.display = 'none';
        }
    });

    showToast(`Showing ${visibleCount} pandals`, 'info');
}

function handleSearch(event) {
    const query = event.target.value.toLowerCase();
    const cards = document.querySelectorAll('.pandal-card');
    let visibleCount = 0;

    cards.forEach(card => {
        const name = card.getAttribute('data-name');
        const location = card.getAttribute('data-location');

        const matchesSearch = query === '' ||
            name.includes(query) ||
            location.includes(query);

        let matchesFilter = true;
        if (currentFilter !== 'all') {
            const cardType = card.getAttribute('data-type');
            const cardId = card.getAttribute('data-id');
            const isAccessible = card.getAttribute('data-accessible') === 'true';

            switch(currentFilter) {
                case 'accessible':
                    matchesFilter = isAccessible;
                    break;
                case 'bookmarked':
                    matchesFilter = appState.bookmarked.includes(cardId);
                    break;
                default:
                    matchesFilter = cardType === currentFilter;
            }
        }

        if (matchesSearch && matchesFilter) {
            card.style.display = 'block';
            visibleCount++;
        } else {
            card.style.display = 'none';
        }
    });
}

// Food Filter
function filterFood(type) {
    const cards = document.querySelectorAll('.food-card');
    const filterBtns = document.querySelectorAll('#food .filter-btn');

    filterBtns.forEach(btn => btn.classList.remove('active'));
    if (event && event.target) {
        event.target.classList.add('active');
    }

    cards.forEach(card => {
        const cardType = card.getAttribute('data-type');
        const shouldShow = type === 'all' || cardType === type;
        card.style.display = shouldShow ? 'block' : 'none';
    });
}

function handleFoodSearch(event) {
    const query = event.target.value.toLowerCase();
    const cards = document.querySelectorAll('.food-card');

    cards.forEach(card => {
        const name = card.querySelector('h4').textContent.toLowerCase();
        const shouldShow = query === '' || name.includes(query);
        card.style.display = shouldShow ? 'block' : 'none';
    });
}

// Bookmark Functions
function toggleBookmark(pandalId) {
    const index = appState.bookmarked.indexOf(pandalId);
    const pandal = pandalData.find(p => p.id === pandalId);

    if (index > -1) {
        appState.bookmarked.splice(index, 1);
        showToast(`Removed ${pandal.name} from bookmarks`, 'info');
    } else {
        appState.bookmarked.push(pandalId);
        showToast(`Added ${pandal.name} to bookmarks`, 'success');
        awardPoints(5, 'Bookmark added');
    }

    appState.save();
    generatePandalCards();
    updateStats();
}

function markVisited(pandalId) {
    if (!appState.visited.includes(pandalId)) {
        appState.visited.push(pandalId);
        const pandal = pandalData.find(p => p.id === pandalId);

        awardPoints(10, 'Pandal visited');
        showToast(`Visited ${pandal.name}! +10 points`, 'success');

        appState.save();
        generatePandalCards();
        updateProgress();
        updateStats();
        checkAchievements();
    } else {
        showToast('Already marked as visited', 'info');
    }
}

// Location Functions
function openGoogleMaps(lat, lng, name) {
    const confirmOpen = confirm(`Do you want to open Google Maps for directions to ${name}?`);

    if (confirmOpen) {
        // Fixed URL construction - removed duplicate query parameter
        const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&destination_place_id=${encodeURIComponent(name)}`;
        window.open(url, '_blank');
        showToast(`Opening directions to ${name}`, 'info');
    } else {
        showToast('Cancelled opening Google Maps', 'warning');
    }
}

function getCurrentLocation() {
    if (navigator.geolocation) {
        showToast('Finding your location...', 'info');

        navigator.geolocation.getCurrentPosition(
            (position) => {
                userLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };

                showNearbyPandals();
                showToast('Location found! Showing nearby pandals', 'success');
                generatePandalCards(); // Refresh to show distances

                if (map) {
                    map.setView([userLocation.lat, userLocation.lng], 13);
                    L.marker([userLocation.lat, userLocation.lng])
                        .addTo(map)
                        .bindPopup('Your Location')
                        .openPopup();
                }
            },
            (error) => {
                console.error('Geolocation error:', error);
                let errorMessage = 'Could not get your location';

                switch(error.code) {
                    case error.PERMISSION_DENIED:
                        errorMessage = 'Location access denied by user';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMessage = 'Location information unavailable';
                        break;
                    case error.TIMEOUT:
                        errorMessage = 'Location request timed out';
                        break;
                }

                showToast(errorMessage, 'error');
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 60000
            }
        );
    } else {
        showToast('Geolocation is not supported by this browser', 'error');
    }
}

function getCurrentLocation() {
    if (navigator.geolocation) {
        showToast('Finding your location...', 'info');

        navigator.geolocation.getCurrentPosition(
            (position) => {
                userLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };

                showNearbyPandals();
                showToast('Location found! Showing nearby pandals', 'success');
                generatePandalCards(); // Refresh to show distances

                if (map) {
                    map.setView([userLocation.lat, userLocation.lng], 13);
                    L.marker([userLocation.lat, userLocation.lng])
                        .addTo(map)
                        .bindPopup('Your Location')
                        .openPopup();
                }
            },
            (error) => {
                console.error('Geolocation error:', error);
                showToast('Could not get your location', 'error');
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
        );
    } else {
        showToast('Geolocation is not supported', 'error');
    }
}

function showNearbyPandals() {
    if (!userLocation) {
        getCurrentLocation();
        return;
    }

    const distances = pandalData.map(pandal => {
        const distance = calculateDistance(userLocation.lat, userLocation.lng, pandal.lat, pandal.lng);
        return { pandal, distance };
    });

    distances.sort((a, b) => a.distance - b.distance);

    // Show top 5 nearest pandals
    const cards = document.querySelectorAll('.pandal-card');
    cards.forEach(card => {
        card.style.display = 'none';
    });

    distances.slice(0, 5).forEach(item => {
        const card = document.querySelector(`[data-id="${item.pandal.id}"]`);
        if (card) {
            card.style.display = 'block';
        }
    });

    showToast('Showing 5 nearest pandals', 'success');
}

function calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// Route Functions
function showRouteType(type) {
    filterPandals(type);
    showToast(`Showing ${type} route pandals`, 'info');

    // Initialize interactive map for the specific route type
    if (map) {
        // Clear existing markers
        map.eachLayer((layer) => {
            if (layer instanceof L.CircleMarker) {
                map.removeLayer(layer);
            }
        });

        // Add markers for filtered pandals
        const filteredPandals = pandalData.filter(p => p.type === type);
        filteredPandals.forEach((pandal, index) => {
            const marker = L.circleMarker([pandal.lat, pandal.lng], {
                radius: 8,
                fillColor: '#FF6B35',
                color: '#fff',
                weight: 2,
                opacity: 1,
                fillOpacity: 0.8
            }).addTo(map);

            const displayName = currentLanguage === 'bn' ? pandal.nameBn : pandal.name;
            marker.bindPopup(`
                        <div style="min-width: 200px;">
                            <h4>${displayName}</h4>
                            <p><strong>${index + 1}.</strong> ${pandal.type.toUpperCase()} Route Stop</p>
                            <button onclick="openGoogleMaps(${pandal.lat}, ${pandal.lng}, '${pandal.name}')" style="width: 100%; padding: 8px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">
                                Get Directions
                            </button>
                        </div>
                    `);
        });

        // Fit map to show all markers
        if (filteredPandals.length > 0) {
            const group = new L.featureGroup(map._layers);
            if (Object.keys(group._layers).length > 0) {
                map.fitBounds(group.getBounds().pad(0.1));
            }
        }
    }
}

function optimizeRoute() {
    if (appState.bookmarked.length < 2) {
        showToast('Please bookmark at least 2 pandals to optimize route', 'warning');
        return;
    }

    showToast('Optimizing your route...', 'info');

    setTimeout(() => {
        const route = {
            id: Date.now(),
            name: `Optimized Route ${new Date().toLocaleDateString()}`,
            pandals: appState.bookmarked.slice(),
            type: 'optimized',
            created: new Date().toISOString()
        };

        appState.routes.push(route);
        appState.save();

        showToast('Route optimized! Check "My Routes" to view', 'success');
        awardPoints(25, 'Route optimization');
    }, 2000);
}

function trackRoute() {
    if (isTracking) {
        stopTracking();
        return;
    }

    if (!navigator.geolocation) {
        showToast('GPS tracking not supported', 'error');
        return;
    }

    isTracking = true;
    showToast('GPS tracking started', 'success');

    watchId = navigator.geolocation.watchPosition(
        (position) => {
            userLocation = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
            };
            generatePandalCards(); // Update distance info
            checkNearbyPandals();
        },
        (error) => {
            console.error('GPS tracking error:', error);
            showToast('GPS tracking error', 'error');
            stopTracking();
        },
        { enableHighAccuracy: true, timeout: 30000, maximumAge: 60000 }
    );
}

function stopTracking() {
    isTracking = false;

    if (watchId) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
    }

    showToast('GPS tracking stopped', 'info');
}

function checkNearbyPandals() {
    if (!userLocation) return;

    const unvisitedPandals = pandalData.filter(p => !appState.visited.includes(p.id));

    unvisitedPandals.forEach(pandal => {
        const distance = calculateDistance(
            userLocation.lat, userLocation.lng,
            pandal.lat, pandal.lng
        );

        if (distance < 0.1) { // Within 100 meters
            const displayName = currentLanguage === 'bn' ? pandal.nameBn : pandal.name;
            showToast(`You're near ${displayName}! Mark as visited?`, 'info');
        }
    });
}

// Map Functions
function initializeMap() {
    const mapContainer = document.getElementById('mapContainer');
    if (!mapContainer || map) return;

    try {
        mapContainer.innerHTML = '<div id="leafletMap" style="height: 100%; width: 100%;"></div>';

        // Initialize map centered on Kolkata
        map = L.map('leafletMap').setView([22.5726, 88.3639], 12);

        // Add OpenStreetMap tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 18
        }).addTo(map);

        // Add markers for all pandals
        pandalData.forEach(pandal => {
            const isVisited = appState.visited.includes(pandal.id);
            const isBookmarked = appState.bookmarked.includes(pandal.id);

            let markerColor = '#FF6B35'; // Default orange
            if (isVisited) markerColor = '#00B894'; // Green for visited
            else if (isBookmarked) markerColor = '#E17055'; // Red for bookmarked

            const marker = L.circleMarker([pandal.lat, pandal.lng], {
                radius: 8,
                fillColor: markerColor,
                color: '#fff',
                weight: 2,
                opacity: 1,
                fillOpacity: 0.8
            }).addTo(map);

            const displayName = currentLanguage === 'bn' ? pandal.nameBn : pandal.name;
            const displayTheme = currentLanguage === 'bn' ? pandal.themeBn : pandal.theme;

            const popupContent = `
                        <div style="min-width: 200px;">
                            <h4>${displayName}</h4>
                            <p><strong>Type:</strong> ${pandal.type}</p>
                            <p><strong>Theme:</strong> ${displayTheme}</p>
                            <div style="margin-top: 10px;">
                                <button onclick="markVisited('${pandal.id}')" style="margin-right: 5px; padding: 5px 10px; background: #00B894; color: white; border: none; border-radius: 4px; cursor: pointer;">
                                    ${isVisited ? 'Visited ✓' : 'Mark Visited'}
                                </button>
                                <button onclick="toggleBookmark('${pandal.id}')" style="padding: 5px 10px; background: #E17055; color: white; border: none; border-radius: 4px; cursor: pointer;">
                                    ${isBookmarked ? 'Bookmarked ❤️' : 'Bookmark'}
                                </button>
                            </div>
                            <div style="margin-top: 10px;">
                                <button onclick="openGoogleMaps(${pandal.lat}, ${pandal.lng}, '${pandal.name}')" style="width: 100%; padding: 8px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">
                                    <i class="fas fa-directions"></i> Get Google Directions
                                </button>
                            </div>
                        </div>
                    `;

            marker.bindPopup(popupContent);
        });

        showToast('Interactive map loaded successfully!', 'success');
    } catch (error) {
        console.error('Map initialization error:', error);
        mapContainer.innerHTML = `
                    <div style="height: 100%; display: flex; align-items: center; justify-content: center; background: var(--bg-secondary); border-radius: 12px; color: var(--text-secondary);">
                        <div style="text-align: center;">
                            <i class="fas fa-map" style="font-size: 3rem; margin-bottom: 1rem;"></i>
                            <h3>Map Loading...</h3>
                            <p>Interactive map will appear here</p>
                        </div>
                    </div>
                `;
    }
}

// Complete Weather System JavaScript with Animated Backgrounds
// Enhanced Weather System - Replace the weather section in your script.js with this code
// Weather API Configuration
// Weather API Configuration
const WEATHER_CONFIG = {
    API_KEY: 'demo_key', // Replace with your OpenWeatherMap API key
    BASE_URL: 'https://api.openweathermap.org/data/2.5',
    DEFAULT_CITY: 'Kolkata,IN',
    COORDS: { lat: 22.5726, lon: 88.3639 }, // Kolkata coordinates
    CACHE_DURATION: 10 * 60 * 1000, // 10 minutes
    FALLBACK_DATA: {
        current: {
            temp: 29,
            condition: { en: "Partly Cloudy", bn: "আংশিক মেঘলা" },
            feelsLike: 32,
            humidity: 75,
            windSpeed: 3.2,
            uvIndex: 7,
            icon: "02d"
        },
        forecast: [
            { day: { en: "Today", bn: "আজ" }, high: 29, low: 24, icon: "02d", desc: "Partly Cloudy" },
            { day: { en: "Tomorrow", bn: "কাল" }, high: 31, low: 25, icon: "01d", desc: "Sunny" },
            { day: { en: "Wed", bn: "বুধ" }, high: 28, low: 23, icon: "10d", desc: "Light Rain" },
            { day: { en: "Thu", bn: "বৃহ" }, high: 30, low: 24, icon: "03d", desc: "Cloudy" },
            { day: { en: "Fri", bn: "শুক্র" }, high: 27, low: 22, icon: "09d", desc: "Heavy Rain" }
        ]
    }
};

// Weather System Class
class WeatherSystem {
    constructor() {
        this.cachedData = null;
        this.lastFetch = 0;
        this.isOnline = navigator.onLine;

        // Setup network listeners
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.refreshWeatherData();
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
        });
    }

    // Check if cached data is still valid
    isCacheValid() {
        return this.cachedData &&
            (Date.now() - this.lastFetch) < WEATHER_CONFIG.CACHE_DURATION;
    }

    // Fetch weather data from API
    async fetchWeatherData() {
        if (!this.isOnline) {
            return this.getFallbackWeatherData();
        }

        try {
            // For demo purposes, we'll use fallback data
            // In production, uncomment and use real API calls:
            /*
            const currentWeatherUrl = `${WEATHER_CONFIG.BASE_URL}/weather?lat=${WEATHER_CONFIG.COORDS.lat}&lon=${WEATHER_CONFIG.COORDS.lon}&appid=${WEATHER_CONFIG.API_KEY}&units=metric`;
            const forecastUrl = `${WEATHER_CONFIG.BASE_URL}/forecast?lat=${WEATHER_CONFIG.COORDS.lat}&lon=${WEATHER_CONFIG.COORDS.lon}&appid=${WEATHER_CONFIG.API_KEY}&units=metric`;
            
            const [currentResponse, forecastResponse] = await Promise.all([
                fetch(currentWeatherUrl),
                fetch(forecastUrl)
            ]);

            if (!currentResponse.ok || !forecastResponse.ok) {
                throw new Error('Weather API request failed');
            }

            const currentData = await currentResponse.json();
            const forecastData = await forecastResponse.json();

            return this.processWeatherData(currentData, forecastData);
            */

            // Using fallback data for now
            return this.getFallbackWeatherData();

        } catch (error) {
            console.error('Weather fetch error:', error);
            return this.getFallbackWeatherData();
        }
    }

    // Process API response data
    processWeatherData(currentData, forecastData) {
        const current = {
            temp: Math.round(currentData.main.temp),
            condition: {
                en: currentData.weather[0].main,
                bn: this.translateWeatherCondition(currentData.weather[0].main)
            },
            feelsLike: Math.round(currentData.main.feels_like),
            humidity: currentData.main.humidity,
            windSpeed: currentData.wind.speed,
            uvIndex: 6, // UV index would need separate API call
            icon: currentData.weather[0].icon
        };

        const forecast = forecastData.list
            .filter((item, index) => index % 8 === 0) // Get one per day
            .slice(0, 5)
            .map((item, index) => {
                const date = new Date(item.dt * 1000);
                const dayNames = [
                    { en: "Today", bn: "আজ" },
                    { en: "Tomorrow", bn: "কাল" },
                    { en: "Wed", bn: "বুধ" },
                    { en: "Thu", bn: "বৃহ" },
                    { en: "Fri", bn: "শুক্র" }
                ];

                return {
                    day: dayNames[index] || {
                        en: date.toLocaleDateString('en', { weekday: 'short' }),
                        bn: date.toLocaleDateString('bn', { weekday: 'short' })
                    },
                    high: Math.round(item.main.temp_max),
                    low: Math.round(item.main.temp_min),
                    icon: item.weather[0].icon,
                    desc: item.weather[0].description
                };
            });

        return { current, forecast };
    }

    // Translate weather conditions to Bengali
    translateWeatherCondition(condition) {
        const translations = {
            'Clear': 'পরিষ্কার',
            'Clouds': 'মেঘলা',
            'Rain': 'বৃষ্টি',
            'Drizzle': 'গুঁড়ি গুঁড়ি বৃষ্টি',
            'Thunderstorm': 'বজ্রঝড়',
            'Snow': 'তুষারপাত',
            'Mist': 'কুয়াশা',
            'Fog': 'ঘন কুয়াশা',
            'Haze': 'ধোঁয়াশা',
            'Partly Cloudy': 'আংশিক মেঘলা'
        };
        return translations[condition] || condition;
    }

    // Get fallback weather data
    getFallbackWeatherData() {
        // Add some randomness to make it feel more realistic
        const baseTemp = 29;
        const tempVariation = Math.floor(Math.random() * 6) - 3; // -3 to +3
        const currentTemp = baseTemp + tempVariation;

        return {
            current: {
                ...WEATHER_CONFIG.FALLBACK_DATA.current,
                temp: currentTemp,
                feelsLike: currentTemp + 3
            },
            forecast: WEATHER_CONFIG.FALLBACK_DATA.forecast.map(day => ({
                ...day,
                high: day.high + tempVariation,
                low: day.low + tempVariation
            }))
        };
    }

    // Get weather data (with caching)
    async getWeatherData() {
        if (this.isCacheValid()) {
            return this.cachedData;
        }

        const data = await this.fetchWeatherData();
        this.cachedData = data;
        this.lastFetch = Date.now();
        return data;
    }

    // Refresh weather data
    async refreshWeatherData() {
        this.lastFetch = 0; // Force refresh
        return await this.getWeatherData();
    }
}

// Create global weather system instance
const weatherSystem = new WeatherSystem();

// Weather Functions
function showWeatherInfo() {
    const widget = document.getElementById('weatherWidget');
    if (widget) {
        widget.classList.add('show');
        updateWeatherData();
        if (typeof closeSideMenu === 'function') {
            closeSideMenu();
        }
    }
}

function hideWeatherWidget() {
    const widget = document.getElementById('weatherWidget');
    if (widget) {
        widget.classList.remove('show');
    }
}

async function updateWeatherData() {
    try {
        // Show loading state
        showWeatherLoading();

        // Get weather data
        const weatherData = await weatherSystem.getWeatherData();

        // Update current weather with animations
        updateCurrentWeatherWithAnimation(weatherData.current);

        // Update forecast
        updateWeatherForecast(weatherData.forecast);

        // Hide loading state
        hideWeatherLoading();

    } catch (error) {
        console.error('Weather update error:', error);
        showWeatherError();
    }
}

function showWeatherLoading() {
    const currentTemp = document.getElementById('currentTemp');
    const currentCondition = document.getElementById('currentCondition');

    if (currentTemp) currentTemp.textContent = '--°C';
    if (currentCondition) currentCondition.textContent = 'Loading...';
}

function hideWeatherLoading() {
    // Loading is hidden when data is populated
}

function showWeatherError() {
    const currentTemp = document.getElementById('currentTemp');
    const currentCondition = document.getElementById('currentCondition');

    if (currentTemp) currentTemp.textContent = '--°C';
    if (currentCondition) currentCondition.textContent = 'Weather unavailable';
}

// Enhanced updateCurrentWeather function with animation control
function updateCurrentWeatherWithAnimation(current) {
    // Update current weather elements first
    const elements = {
        currentTemp: document.getElementById('currentTemp'),
        currentCondition: document.getElementById('currentCondition'),
        feelsLike: document.getElementById('feelsLike'),
        humidity: document.getElementById('humidity'),
        windSpeed: document.getElementById('windSpeed'),
        uvIndex: document.getElementById('uvIndex')
    };

    if (elements.currentTemp) {
        elements.currentTemp.textContent = `${current.temp}°C`;
    }

    if (elements.currentCondition) {
        const condition = (typeof currentLanguage !== 'undefined' && currentLanguage === 'bn') ?
            current.condition.bn : current.condition.en;
        elements.currentCondition.textContent = condition;
    }

    if (elements.feelsLike) {
        elements.feelsLike.textContent = `${current.feelsLike}°C`;
    }

    if (elements.humidity) {
        elements.humidity.textContent = `${current.humidity}%`;
    }

    if (elements.windSpeed) {
        elements.windSpeed.textContent = `${current.windSpeed} m/s`;
    }

    if (elements.uvIndex) {
        elements.uvIndex.textContent = current.uvIndex;
    }

    // Update weather background with animation based on condition and icon
    updateWeatherBackground(current.condition.en, current.icon);

    // Update weather tips
    updateWeatherTipsWithAnimation(current);
}

// Update weather background with 3 GIFs - Sunny Day, Rainy Day, Night
function updateWeatherBackground(condition, iconCode) {
    const weatherSection = document.getElementById('weatherCurrentSection');
    if (!weatherSection) return;

    // Add changing animation class
    weatherSection.classList.add('changing');

    // Remove all existing weather classes
    const weatherClasses = ['sunny-weather', 'rainy-weather', 'night-weather'];
    weatherClasses.forEach(cls => weatherSection.classList.remove(cls));

    // Determine weather type
    const isNight = iconCode && iconCode.includes('n');
    const isRainy = condition.toLowerCase().includes('rain') ||
        condition.toLowerCase().includes('storm') ||
        condition.toLowerCase().includes('drizzle') ||
        iconCode === '09d' || iconCode === '09n' ||
        iconCode === '10d' || iconCode === '10n' ||
        iconCode === '11d' || iconCode === '11n';

    let weatherClass = '';
    let backgroundImage = '';

    if (isNight) {
        // Night time - use night GIF
        weatherClass = 'night-weather';
        backgroundImage = 'url("https://i.pinimg.com/originals/ee/13/ed/ee13ed04ac3830b0fb958e1ef1c04f04.gif")';
        console.log('Applied night weather animation');
    } else if (isRainy) {
        // Rainy day - use rainy GIF
        weatherClass = 'rainy-weather';
        backgroundImage = 'url("https://i.pinimg.com/originals/d0/b9/5d/d0b95d0dcef615afc9f7e8186b8a4dd8.gif")';
        console.log('Applied rainy weather animation');
    } else {
        // Sunny/clear day - use sunny GIF
        weatherClass = 'sunny-weather';
        backgroundImage = 'url("https://i.pinimg.com/originals/26/6f/39/266f392d2b02ea526eb557b6018e6ee9.gif")';
        console.log('Applied sunny weather animation');
    }

    // Apply background image directly
    weatherSection.style.backgroundImage = backgroundImage;
    weatherSection.style.backgroundSize = 'cover';
    weatherSection.style.backgroundPosition = 'center';
    weatherSection.style.backgroundRepeat = 'no-repeat';

    // Add the weather class with a slight delay for smooth transition
    setTimeout(() => {
        weatherSection.classList.add(weatherClass);
    }, 200);

    // Remove changing class after transition
    setTimeout(() => {
        weatherSection.classList.remove('changing');
    }, 1500);

    // Add a subtle transition effect
    weatherSection.style.transition = 'all 0.8s ease-in-out';
}

function updateWeatherForecast(forecast) {
    const forecastGrid = document.getElementById('forecastGrid');
    if (!forecastGrid) return;

    forecastGrid.innerHTML = forecast.map(day => {
        const dayName = (typeof currentLanguage !== 'undefined' && currentLanguage === 'bn') ?
            day.day.bn : day.day.en;
        const weatherIcon = getWeatherIcon(day.icon);

        return `
            <div class="forecast-day">
                <div class="forecast-day-name">${dayName}</div>
                <div class="forecast-icon">${weatherIcon}</div>
                <div class="forecast-temps">
                    <span class="forecast-high">${day.high}°</span>
                    <span class="forecast-low">${day.low}°</span>
                </div>
                <div class="forecast-desc">${day.desc}</div>
            </div>
        `;
    }).join('');
}

function getWeatherIcon(iconCode) {
    // these emoji's will stay here becuase these will imporve the view of html site Emoji representing the weather state
    const iconMap = {
        '01d': '☀️', '01n': '🌙', // clear sky (day/night)
        '02d': '⛅', '02n': '☁️', // few clouds (day/night)
        '03d': '☁️', '03n': '☁️',
        '04d': '☁️', '04n': '☁️',
        '09d': '🌧️', '09n': '🌧️', // shower rain
        '10d': '🌦️', '10n': '🌧️',
        '11d': '⛈️', '11n': '⛈️', // thunderstorm
        '13d': '🌨️', '13n': '🌨️', // snow
        '50d': '🌫️', '50n': '🌫️' // mist / fog
    };
    return iconMap[iconCode] || '🌤️';
}

// Weather refresh functionality
async function refreshWeatherData() {
    const refreshBtn = document.querySelector('.weather-refresh');

    if (refreshBtn) {
        const refreshIcon = refreshBtn.querySelector('i');

        // Show loading state
        refreshBtn.classList.add('spinning');
        if (refreshIcon) refreshIcon.className = 'fas fa-spinner';

        try {
            // Force refresh weather data
            await weatherSystem.refreshWeatherData();
            await updateWeatherData();

            if (typeof showToast === 'function') {
                showToast('Weather data updated!', 'success');
            }
        } catch (error) {
            console.error('Weather refresh error:', error);
            if (typeof showToast === 'function') {
                showToast('Failed to update weather', 'error');
            }
        } finally {
            // Reset loading state
            setTimeout(() => {
                if (refreshBtn) refreshBtn.classList.remove('spinning');
                if (refreshIcon) refreshIcon.className = 'fas fa-sync-alt';
            }, 1000);
        }
    }
}

// Enhanced weather tips with animation-aware content
function updateWeatherTipsWithAnimation(currentWeather) {
    const tipElement = document.getElementById('weatherTip');
    if (!tipElement) return;

    const isNight = currentWeather.icon && currentWeather.icon.includes('n');
    const condition = currentWeather.condition.en.toLowerCase();

    const tips = {
        day: {
            en: "Perfect weather for pandal hopping! Stay hydrated and enjoy the festivities.",
            bn: "প্যান্ডেল ঘোরার জন্য নিখুঁত আবহাওয়া! হাইড্রেটেড থাকুন এবং উৎসব উপভোগ করুন।"
        },
        night: {
            en: "Beautiful night for evening pandal visits! Perfect time for lights and decorations.",
            bn: "সন্ধ্যায় প্যান্ডেল দেখার জন্য সুন্দর রাত! আলো এবং সাজসজ্জার জন্য নিখুঁত সময়।"
        },
        rainy: {
            en: "Rainy weather! Carry an umbrella and wear waterproof shoes for pandal visits.",
            bn: "বৃষ্টির আবহাওয়া! প্যান্ডেল দেখার জন্য ছাতা এবং জলরোধী জুতা নিন।"
        },
        default: {
            en: "Best pandal visiting hours: Morning (6-10 AM) and Evening (4-8 PM)",
            bn: "প্যান্ডেল দেখার সেরা সময়: সকাল (৬-১০টা) এবং সন্ধ্যা (৪-৮টা)"
        }
    };

    let selectedTip = tips.default;

    // Select appropriate tip based on weather and time
    if (condition.includes('rain') || condition.includes('storm')) {
        selectedTip = tips.rainy;
    } else if (isNight) {
        selectedTip = tips.night;
    } else {
        selectedTip = tips.day;
    }

    const tipText = (typeof currentLanguage !== 'undefined' && currentLanguage === 'bn') ?
        selectedTip.bn : selectedTip.en;

    tipElement.innerHTML = `<i class="fas fa-lightbulb"></i> <span>${tipText}</span>`;
}

// Auto-refresh weather data every 10 minutes
setInterval(() => {
    const weatherWidget = document.getElementById('weatherWidget');
    if (weatherWidget && weatherWidget.classList.contains('show')) {
        updateWeatherData();
    }
}, 10 * 60 * 1000);

// Initialize weather system
document.addEventListener('DOMContentLoaded', function() {
    // Pre-load weather data
    if (weatherSystem) {
        weatherSystem.getWeatherData();
    }

    // Set initial weather state if weather widget is visible
    const weatherWidget = document.getElementById('weatherWidget');
    if (weatherWidget && weatherWidget.classList.contains('show')) {
        updateWeatherData();
    }

    // Add smooth transitions to weather section
    const weatherSection = document.getElementById('weatherCurrentSection');
    if (weatherSection) {
        weatherSection.style.transition = 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)';
    }
});

// Export functions to global scope
window.showWeatherInfo = showWeatherInfo;
window.hideWeatherWidget = hideWeatherWidget;
window.updateWeatherData = updateWeatherData;
window.refreshWeatherData = refreshWeatherData;
window.weatherSystem = weatherSystem;
window.updateWeatherBackground = updateWeatherBackground;
window.updateCurrentWeatherWithAnimation = updateCurrentWeatherWithAnimation;
window.updateWeatherTipsWithAnimation = updateWeatherTipsWithAnimation;

// Enhanced Calendar Functions with Monthly Animated Backgrounds - COMPLETE VERSION
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();


// Durga Puja dates for 2025
const pujaDates2025 = {
    8: { // September
        21: 'Mahalaya',
        28: 'Sasthi',
        29: 'Saptami',
        30: 'Astami'
    },
    9: { // October
        1: 'Navami',
        2: 'Dashami'
    }
};

const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

const monthNamesBengali = [
    'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
    'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
];

/**
 * Apply monthly background to calendar widget
 */
function applyMonthlyBackground(month) {
    const calendarWidget = document.getElementById('calendarWidget');
    if (!calendarWidget) return;

    // Add transition class
    calendarWidget.classList.add('transitioning');

    // Remove existing month classes
    for (let i = 0; i < 12; i++) {
        calendarWidget.classList.remove(`month-${i}`);
    }

    // Add new month class
    setTimeout(() => {
        calendarWidget.classList.add(`month-${month}`);

        // Remove transition class after animation
        setTimeout(() => {
            calendarWidget.classList.remove('transitioning');
        }, 1000);
    }, 100);
}

/**
 * Enhanced showCalendarWidget function with background support
 */
function showCalendarWidget() {
    const widget = document.getElementById('calendarWidget');
    const overlay = document.getElementById('calendarOverlay');

    if (!widget) return;

    // Show overlay if it exists
    if (overlay) {
        overlay.style.display = 'block';
    }

    // Show widget with animation
    widget.classList.add('show');

    // Apply current month background
    applyMonthlyBackground(currentMonth);

    // Update calendar content
    updateCalendar();

    // Prevent body scroll
    document.body.style.overflow = 'hidden';

    // Close side menu if function exists
    if (typeof closeSideMenu === 'function') {
        closeSideMenu();
    }

    // Add seasonal sound effect (optional)
    playSeasonalSound(currentMonth);
}

/**
 * Alternative function name for backward compatibility
 */
function showCalendar() {
    showCalendarWidget();
}

/**
 * Hide calendar widget with proper cleanup
 */
function hideCalendarWidget() {
    const widget = document.getElementById('calendarWidget');
    const overlay = document.getElementById('calendarOverlay');

    if (!widget) return;

    // Hide widget
    widget.classList.remove('show');

    // Hide overlay if it exists
    if (overlay) {
        overlay.style.display = 'none';
    }

    // Clean up month classes
    for (let i = 0; i < 12; i++) {
        widget.classList.remove(`month-${i}`);
    }

    // Restore body scroll
    document.body.style.overflow = '';
}

/**
 * Update current date/time display
 */
function updateCurrentDateTime() {
    const now = new Date();
    const currentDateTime = document.getElementById('currentDateTime');
    if (currentDateTime) {
        const options = {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };

        const locale = (currentLanguage === 'bn') ? 'bn-BD' : 'en-US';
        currentDateTime.textContent = now.toLocaleString(locale, options);
    }
}

/**
 * Get current display month (helper function)
 */
function getCurrentDisplayMonth() {
    return currentMonth;
}

/**
 * Enhanced updateCalendar function with background changes
 */
function updateCalendar() {
    const monthYear = document.getElementById('monthYear');
    const calendarGrid = document.getElementById('calendarGrid');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');

    if (!calendarGrid) return;

    // Apply background for current displayed month
    applyMonthlyBackground(currentMonth);

    // Update month/year display
    if (monthYear) {
        const monthNamesArray = (currentLanguage === 'bn') ? monthNamesBengali : monthNames;
        monthYear.textContent = `${monthNamesArray[currentMonth]} ${currentYear}`;
    }

    // Navigation buttons
    if (prevBtn) prevBtn.disabled = (currentYear < 2020);
    if (nextBtn) nextBtn.disabled = (currentYear > 2030);

    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const startingDayOfWeek = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    const prevMonth = new Date(currentYear, currentMonth, 0);
    const prevMonthDays = prevMonth.getDate();

    const today = new Date();
    const todayDate = today.getDate();
    const todayMonth = today.getMonth();
    const todayYear = today.getFullYear();

    let calendarHTML = '';

    // Previous month's trailing days
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
        const day = prevMonthDays - i;
        const prevMonthIndex = currentMonth === 0 ? 11 : currentMonth - 1;
        const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;

        let classes = 'calendar-day other-month';
        if (prevYear === todayYear && prevMonthIndex === todayMonth && day === todayDate) {
            classes += ' today';
        }

        calendarHTML += `<div class="${classes}" onclick="selectDate(${day}, ${prevMonthIndex}, ${prevYear})">${day}</div>`;
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
        let classes = 'calendar-day';
        let pujaName = '';

        if (currentYear === todayYear && currentMonth === todayMonth && day === todayDate) {
            classes += ' today';
        }

        if (currentYear === 2025 && pujaDates2025[currentMonth] && pujaDates2025[currentMonth][day]) {
            classes += ' puja-day';
            pujaName = `<div class="puja-name" style="font-size: 0.7rem; margin-top: 2px; font-weight: bold;">${pujaDates2025[currentMonth][day]}</div>`;
        }

        calendarHTML += `<div class="${classes}" onclick="selectDate(${day}, ${currentMonth}, ${currentYear})">
            ${day}
            ${pujaName}
        </div>`;
    }

    // Next month's leading days
    const totalCells = Math.ceil((startingDayOfWeek + daysInMonth) / 7) * 7;
    const remainingCells = totalCells - (startingDayOfWeek + daysInMonth);

    for (let day = 1; day <= remainingCells; day++) {
        const nextMonthIndex = currentMonth === 11 ? 0 : currentMonth + 1;
        const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;

        let classes = 'calendar-day other-month';
        if (nextYear === todayYear && nextMonthIndex === todayMonth && day === todayDate) {
            classes += ' today';
        }

        calendarHTML += `<div class="${classes}" onclick="selectDate(${day}, ${nextMonthIndex}, ${nextYear})">${day}</div>`;
    }

    calendarGrid.innerHTML = calendarHTML;
    updateCurrentDateTime();

    // Add entrance animation for calendar days
    setTimeout(() => {
        const days = calendarGrid.querySelectorAll('.calendar-day');
        days.forEach((day, index) => {
            day.style.animationDelay = `${index * 20}ms`;
            day.classList.add('calendar-day-enter');
        });
    }, 100);
}

/**
 * Enhanced changeMonth function with smooth background transitions
 */
function changeMonth(direction) {
    const calendarWidget = document.getElementById('calendarWidget');

    // Add transition effect
    if (calendarWidget) {
        calendarWidget.classList.add('transitioning');
    }

    currentMonth += direction;

    if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
    } else if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
    }

    // Delayed update for smooth transition
    setTimeout(() => {
        updateCalendar();

        // Show seasonal transition message
        showSeasonalMessage(currentMonth);

        if (calendarWidget) {
            calendarWidget.classList.remove('transitioning');
        }
    }, 250);
}

/**
 * Select date with enhanced feedback
 */
function selectDate(day, month, year) {
    const selectedDate = new Date(year, month, day);
    const isPujaDay = year === 2025 && pujaDates2025[month] && pujaDates2025[month][day];

    // Create selection effect
    const dateElements = document.querySelectorAll('.calendar-day');
    dateElements.forEach(el => {
        if (el.textContent.trim().startsWith(day.toString())) {
            el.classList.add('selected-flash');
            setTimeout(() => el.classList.remove('selected-flash'), 1000);
        }
    });

    if (isPujaDay) {
        const pujaName = pujaDates2025[month][day];
        const message = ` ${pujaName} - ${selectedDate.toDateString()}\n\nDurga Puja celebration day!`;

        // Play celebratory sound first
        playPujaSound();

        // Show message
        if (typeof showToast === 'function') {
            showToast(message, 'success');
        } else {
            alert(message);
        }
    } else {
        const message = ` Selected: ${selectedDate.toDateString()}`;
        if (typeof showToast === 'function') {
            showToast(message, 'info');
        } else {
            alert(message);
        }
    }
}

/**
 * Go to today with smooth transition
 */
function goToToday() {
    const today = new Date();
    const newMonth = today.getMonth();
    const newYear = today.getFullYear();

    if (newMonth !== currentMonth || newYear !== currentYear) {
        currentMonth = newMonth;
        currentYear = newYear;

        const calendarWidget = document.getElementById('calendarWidget');
        if (calendarWidget) {
            calendarWidget.classList.add('transitioning');
        }

        setTimeout(() => {
            updateCalendar();
            if (calendarWidget) {
                calendarWidget.classList.remove('transitioning');
            }

            if (typeof showToast === 'function') {
                showToast('Jumped to today!', 'success');
            }
        }, 250);
    } else {
        updateCalendar();
        if (typeof showToast === 'function') {
            showToast('Already viewing current month', 'info');
        }
    }
}

/**
 * Show seasonal message when changing months
 */
function showSeasonalMessage(month) {
    const seasonalMessages = {
        0: { en: "❄️ January - New Year, Fresh Beginnings", bn: "❄️ জানুয়ারি - নতুন বছর, নতুন শুরু" },
        1: { en: " February - Month of Love", bn: " ফেব্রুয়ারি - ভালোবাসার মাস" },
        2: { en: " March - Spring Awakening", bn: " মার্চ - বসন্তের আগমন" },
        3: { en: " April - Blossoming Season", bn: " এপ্রিল - ফুলের মৌসুম" },
        4: { en: " May - Sunny Days Ahead", bn: " মে - রৌদ্রোজ্জ্বল দিনগুলি" },
        5: { en: " June - Summer Vibes", bn: " জুন - গ্রীষ্মের আমেজ" },
        6: { en: " July - Monsoon Magic", bn: " জুলাই - বর্ষার জাদু" },
        7: { en: " August - Festive Preparations", bn: " আগস্ট - উৎসবের প্রস্তুতি" },
        8: { en: " September - Puja Season Begins", bn: " সেপ্টেম্বর - পূজার মৌসুম শুরু" },
        9: { en: " October - Durga Puja Celebrations", bn: " অক্টোবর - দুর্গাপূজার উৎসব" },
        10: { en: " November - Harvest Time", bn: " নভেম্বর - ফসলের সময়" },
        11: { en: " December - Winter Wonderland", bn: " ডিসেম্বর - শীতের সৌন্দর্য" }
    };

    const message = seasonalMessages[month];
    if (message && typeof showToast === 'function') {
        const text = (currentLanguage === 'bn') ? message.bn : message.en;
        showToast(text, 'info');
    }
}

/**
 * Play seasonal sound effects (optional)
 */
function playSeasonalSound(month) {
    // Safe sound implementation with error handling
    if (typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined') {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            // Connect nodes
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            // Different frequencies for different seasons
            const seasonFrequencies = {
                0: 220,  // Winter - A3
                1: 246,  // February - B3  
                2: 261,  // Spring - C4
                3: 293,  // April - D4
                4: 329,  // May - E4
                5: 349,  // Summer - F4
                6: 392,  // July - G4
                7: 440,  // August - A4
                8: 493,  // September - B4
                9: 523,  // October - C5
                10: 587, // November - D5
                11: 659  // December - E5
            };

            oscillator.frequency.setValueAtTime(seasonFrequencies[month] || 440, audioContext.currentTime);
            oscillator.type = 'sine';

            // Gentle fade in/out
            gainNode.gain.setValueAtTime(0, audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.1);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.3);

        } catch (error) {
            console.log('Audio context not available or blocked');
        }
    }
}

/**
 * Play puja celebration sound
 */
function playPujaSound() {
    if (typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined') {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();

            // Play a celebratory chord sequence
            const frequencies = [523, 659, 784]; // C5, E5, G5 - major chord
            const oscillators = [];
            const gainNode = audioContext.createGain();

            gainNode.connect(audioContext.destination);
            gainNode.gain.setValueAtTime(0, audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.15, audioContext.currentTime + 0.1);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.8);

            frequencies.forEach((freq, index) => {
                const osc = audioContext.createOscillator();
                osc.connect(gainNode);
                osc.frequency.setValueAtTime(freq, audioContext.currentTime);
                osc.type = 'sine';
                osc.start(audioContext.currentTime + index * 0.1);
                osc.stop(audioContext.currentTime + 0.8);
                oscillators.push(osc);
            });

        } catch (error) {
            console.log('Puja sound not available');
        }
    }
}

/**
 * Set language preference
 */
function setLanguage(language) {
    currentLanguage = language;
    updateCalendar();
    updateCurrentDateTime();
}

/**
 * Initialize calendar
 */
function initCalendar() {
    // Set up event listeners and initialize
    updateCurrentDateTime();

    // Update time every minute
    setInterval(updateCurrentDateTime, 60000);

    // Initialize with current month background
    setTimeout(() => {
        applyMonthlyBackground(currentMonth);
    }, 100);

    // Add keyboard navigation
    document.addEventListener('keydown', function(e) {
        const widget = document.getElementById('calendarWidget');
        if (widget && widget.classList.contains('show')) {
            switch(e.key) {
                case 'Escape':
                    hideCalendarWidget();
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    changeMonth(-1);
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    changeMonth(1);
                    break;
                case 'Home':
                    e.preventDefault();
                    goToToday();
                    break;
            }
        }
    });

    // Handle responsive behavior
    window.addEventListener('resize', function() {
        const widget = document.getElementById('calendarWidget');
        if (widget && widget.classList.contains('show')) {
            // Adjust calendar if needed on resize
            setTimeout(() => {
                applyMonthlyBackground(currentMonth);
            }, 100);
        }
    });
}

// Additional CSS for calendar day animations (add to your CSS file)
const additionalCSS = `
.calendar-day-enter {
    animation: daySlideIn 0.3s ease-out forwards;
}

@keyframes daySlideIn {
    from {
        opacity: 0;
        transform: translateY(-10px) scale(0.8);
    }
    to {
        opacity: 1;
        transform: translateY(0) scale(1);
    }
}

.selected-flash {
    animation: selectedFlash 1s ease-out;
}

@keyframes selectedFlash {
    0% { 
        background: var(--accent-color);
        transform: scale(1);
        box-shadow: 0 0 0 0 rgba(255, 107, 53, 0.7);
    }
    25% { 
        transform: scale(1.1);
        box-shadow: 0 0 0 10px rgba(255, 107, 53, 0.3);
    }
    50% { 
        box-shadow: 0 0 0 15px rgba(255, 107, 53, 0.1);
    }
    100% { 
        transform: scale(1);
        box-shadow: 0 0 0 0 rgba(255, 107, 53, 0);
    }
}

.puja-name {
    position: absolute;
    bottom: 2px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(139, 0, 0, 0.8);
    color: white;
    padding: 1px 4px;
    border-radius: 3px;
    font-size: 0.6rem;
    white-space: nowrap;
    max-width: 90%;
    overflow: hidden;
    text-overflow: ellipsis;
}
`;

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCalendar);
} else {
    initCalendar();
}
// Enhanced AR/VR Functions with Camera Access
let cameraStream = null;
let arCanvas = null;
let arContext = null;
let selfieFilters = ['none', 'durga', 'marigold', 'traditional'];

// AR/VR Functions
function showARVRFeatures() {
    openModal('arvrModal');
    closeSideMenu();
}

// AR Pandal Finder with Camera Access
function startARExperience() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        showToast('Camera not supported on this device', 'error');
        return;
    }

    showToast('Starting AR Pandal Finder...', 'info');

    // Create AR overlay modal
    createAROverlay();

    navigator.mediaDevices.getUserMedia({
        video: {
            facingMode: 'environment',  // Use back camera
            width: { ideal: 1280 },
            height: { ideal: 720 }
        }
    })
        .then(stream => {
            cameraStream = stream;
            const video = document.getElementById('arVideo');
            video.srcObject = stream;
            video.play();

            // Start AR detection simulation
            startARDetection();
            showToast('AR Camera active! Point at pandals to discover info', 'success');
        })
        .catch(error => {
            console.error('Camera access error:', error);
            showToast('Camera access denied. Please allow camera permissions.', 'error');
            closeAROverlay();
        });
}

function createAROverlay() {
    const arOverlay = document.createElement('div');
    arOverlay.id = 'arOverlay';
    arOverlay.className = 'ar-overlay';
    arOverlay.innerHTML = `
        <div class="ar-container">
            <video id="arVideo" autoplay playsinline></video>
            <canvas id="arCanvas"></canvas>
            <div class="ar-controls">
                <button class="ar-btn" onclick="toggleARInfo()">
                    <i class="fas fa-info-circle"></i> Info
                </button>
                <button class="ar-btn" onclick="captureARPhoto()">
                    <i class="fas fa-camera"></i> Capture
                </button>
                <button class="ar-btn ar-close" onclick="closeAROverlay()">
                    <i class="fas fa-times"></i> Close
                </button>
            </div>
            <div id="arInfo" class="ar-info-panel">
                <h3>AR Pandal Finder Active</h3>
                <p>Point your camera at pandal areas to discover:</p>
                <ul>
                    <li> Nearby pandal locations</li>
                    <li> Theme information</li>
                    <li> Current crowd levels</li>
                    <li> Transport options</li>
                </ul>
            </div>
        </div>
    `;

    document.body.appendChild(arOverlay);

    // Initialize canvas
    const canvas = document.getElementById('arCanvas');
    arContext = canvas.getContext('2d');

    // Resize canvas to match video
    const video = document.getElementById('arVideo');
    video.addEventListener('loadedmetadata', () => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
    });
}

function startARDetection() {
    // Simulate AR pandal detection
    const detectedPandals = [];

    // Add some simulated AR markers
    setTimeout(() => {
        addARMarker('Kumartuli Sarbojanin', 'Heritage', '0.2km away', 150, 100);
    }, 2000);

    setTimeout(() => {
        addARMarker('Baghbazar Sarbojanin', 'Traditional', '0.5km away', 300, 200);
    }, 4000);

    // Start AR rendering loop
    requestAnimationFrame(renderAROverlay);
}

function addARMarker(name, type, distance, x, y) {
    if (!arContext) return;

    // Draw AR marker
    arContext.fillStyle = 'rgba(255, 107, 53, 0.8)';
    arContext.fillRect(x - 60, y - 30, 120, 60);

    arContext.fillStyle = 'white';
    arContext.font = '12px Arial';
    arContext.textAlign = 'center';
    arContext.fillText(name, x, y - 10);
    arContext.fillText(`${type} • ${distance}`, x, y + 5);

    // Add pulse animation
    const pulse = Math.sin(Date.now() / 500) * 0.1 + 0.9;
    arContext.globalAlpha = pulse;
    arContext.strokeStyle = '#ff6b35';
    arContext.lineWidth = 2;
    arContext.strokeRect(x - 65, y - 35, 130, 70);
    arContext.globalAlpha = 1;

    showToast(`Found: ${name}`, 'info');
}

function renderAROverlay() {
    if (!arContext || !document.getElementById('arOverlay')) return;

    // Clear canvas
    arContext.clearRect(0, 0, arContext.canvas.width, arContext.canvas.height);

    // Re-render markers (in a real app, this would use actual AR detection)
    const currentTime = Date.now();
    if (currentTime % 3000 < 100) { // Show markers periodically
        addARMarker('Nearby Pandal', 'Detected', '100m',
            Math.random() * 400 + 100,
            Math.random() * 300 + 100);
    }

    requestAnimationFrame(renderAROverlay);
}

function toggleARInfo() {
    const infoPanel = document.getElementById('arInfo');
    if (infoPanel) {
        infoPanel.style.display = infoPanel.style.display === 'none' ? 'block' : 'none';
    }
}

function captureARPhoto() {
    if (!cameraStream) return;

    const video = document.getElementById('arVideo');
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame
    context.drawImage(video, 0, 0);

    // Add AR overlay
    context.drawImage(document.getElementById('arCanvas'), 0, 0);

    // Convert to blob and trigger download
    canvas.toBlob(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ar-pandal-${Date.now()}.png`;
        a.click();
        URL.revokeObjectURL(url);

        showToast('AR Photo captured!', 'success');
        awardPoints(5, 'AR photo capture');
    });
}

function closeAROverlay() {
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        cameraStream = null;
    }

    const overlay = document.getElementById('arOverlay');
    if (overlay) {
        overlay.remove();
    }

    showToast('AR Experience ended', 'info');
}

// VR Experience
function startVRExperience() {
    showToast('Initializing VR Experience...', 'info');

    // Create VR modal
    createVRExperience();
}

function createVRExperience() {
    const vrModal = document.createElement('div');
    vrModal.id = 'vrModal';
    vrModal.className = 'vr-modal';
    vrModal.innerHTML = `
        <div class="vr-container">
            <div class="vr-header">
                <h2> Virtual Pandal Tour</h2>
                <button onclick="closeVRExperience()" class="vr-close">×</button>
            </div>
            <div class="vr-content">
                <div class="vr-pandal-selector">
                    <h3>Select a Pandal to Visit Virtually:</h3>
                    <div class="vr-pandal-grid">
                        <div class="vr-pandal-card" onclick="startVRTour('kumartuli')">
                            <div class="vr-pandal-image" style="background-image: url('https://example.com/kumartuli.jpg')"></div>
                            <h4>Kumartuli Sarbojanin</h4>
                            <p>Clay Artist Heritage</p>
                        </div>
                        <div class="vr-pandal-card" onclick="startVRTour('baghbazar')">
                            <div class="vr-pandal-image" style="background-image: url('https://example.com/baghbazar.jpg')"></div>
                            <h4>Baghbazar Sarbojanin</h4>
                            <p>Traditional Pandal Art</p>
                        </div>
                        <div class="vr-pandal-card" onclick="startVRTour('sreebhumi')">
                            <div class="vr-pandal-image" style="background-image: url('https://example.com/sreebhumi.jpg')"></div>
                            <h4>Sree Bhumi Sporting</h4>
                            <p>Grand Spectacular Theme</p>
                        </div>
                    </div>
                </div>
                <div id="vrTourArea" class="vr-tour-area" style="display: none;">
                    <div class="vr-viewer">
                        <div class="vr-scene" id="vrScene">
                            <div class="vr-loading">Loading VR Experience...</div>
                        </div>
                        <div class="vr-controls">
                            <button onclick="vrLookAround()" class="vr-control-btn">
                                <i class="fas fa-search"></i> Look Around
                            </button>
                            <button onclick="vrGetInfo()" class="vr-control-btn">
                                <i class="fas fa-info"></i> Get Info
                            </button>
                            <button onclick="vrTakePhoto()" class="vr-control-btn">
                                <i class="fas fa-camera"></i> Photo
                            </button>
                            <button onclick="backToVRSelection()" class="vr-control-btn">
                                <i class="fas fa-arrow-left"></i> Back
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(vrModal);
    showToast('VR Experience ready! Select a pandal to visit.', 'success');
}

function startVRTour(pandalId) {
    const selector = document.querySelector('.vr-pandal-selector');
    const tourArea = document.getElementById('vrTourArea');
    const vrScene = document.getElementById('vrScene');

    selector.style.display = 'none';
    tourArea.style.display = 'block';

    // Simulate VR loading
    vrScene.innerHTML = '<div class="vr-loading">Loading VR Experience...</div>';

    setTimeout(() => {
        vrScene.innerHTML = `
            <div class="vr-panorama">
                <div class="vr-pandal-view">
                    <h3> Virtual Pandal Experience</h3>
                    <div class="vr-360-view">
                        <div class="vr-hotspot" style="top: 30%; left: 20%;" onclick="showVRInfo('idol')">
                            <i class="fas fa-eye"></i>
                        </div>
                        <div class="vr-hotspot" style="top: 60%; left: 70%;" onclick="showVRInfo('decoration')">
                            <i class="fas fa-palette"></i>
                        </div>
                        <div class="vr-hotspot" style="top: 80%; left: 40%;" onclick="showVRInfo('crowd')">
                            <i class="fas fa-users"></i>
                        </div>
                    </div>
                    <p>Use the hotspots (👁) to explore different areas</p>
                </div>
            </div>
        `;
        showToast('VR Tour started! Click on hotspots to explore.', 'success');
        awardPoints(10, 'VR tour started');
    }, 2000);
}

function showVRInfo(type) {
    const messages = {
        idol: 'Beautiful Durga idol with intricate details and traditional Bengali craftsmanship',
        decoration: 'Stunning pandal decorations featuring traditional motifs and modern lighting',
        crowd: 'Current crowd level: Medium. Best viewing time: Evening 6-8 PM'
    };

    showToast(messages[type] || 'Exploring pandal area...', 'info');
}

function vrLookAround() {
    showToast('🔄 Looking around... Discovering hidden details!', 'info');
}

function vrGetInfo() {
    showToast('ℹ Pandal Info: Traditional Bengali architecture, Est. 1952, Famous for clay work', 'info');
}

function vrTakePhoto() {
    showToast('📸 Virtual photo taken! Added to your VR gallery.', 'success');
    awardPoints(5, 'VR photo');
}

function backToVRSelection() {
    const selector = document.querySelector('.vr-pandal-selector');
    const tourArea = document.getElementById('vrTourArea');

    selector.style.display = 'block';
    tourArea.style.display = 'none';
}

function closeVRExperience() {
    const vrModal = document.getElementById('vrModal');
    if (vrModal) {
        vrModal.remove();
    }
    showToast('VR Experience ended', 'info');
}

// Selfie Wall with AR Filters
function openSelfieWall() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        showToast('Camera not supported on this device', 'error');
        return;
    }

    showToast('Opening Selfie Wall...', 'info');
    createSelfieWall();

    navigator.mediaDevices.getUserMedia({
        video: {
            facingMode: 'user',  // Use front camera for selfies
            width: { ideal: 640 },
            height: { ideal: 480 }
        }
    })
        .then(stream => {
            cameraStream = stream;
            const video = document.getElementById('selfieVideo');
            video.srcObject = stream;
            video.play();

            showToast('Selfie camera ready! Try different filters.', 'success');
        })
        .catch(error => {
            console.error('Camera access error:', error);
            showToast('Camera access denied for selfie mode.', 'error');
            closeSelfieWall();
        });
}

function createSelfieWall() {
    const selfieModal = document.createElement('div');
    selfieModal.id = 'selfieModal';
    selfieModal.className = 'selfie-modal';
    selfieModal.innerHTML = `
        <div class="selfie-container">
            <div class="selfie-header">
                <h2> Durga Puja Selfie Wall</h2>
                <button onclick="closeSelfieWall()" class="selfie-close">×</button>
            </div>
            <div class="selfie-content">
                <div class="selfie-camera-area">
                    <video id="selfieVideo" autoplay playsinline></video>
                    <canvas id="selfieCanvas"></canvas>
                    <div class="selfie-overlay" id="selfieOverlay"></div>
                </div>
                <div class="selfie-controls">
                    <div class="filter-selector">
                        <h3>Choose Filter:</h3>
                        <div class="filter-buttons">
                            <button class="filter-btn active" onclick="changeSelfieFilter('none')">
                                <i class="fas fa-user"></i> None
                            </button>
                            <button class="filter-btn" onclick="changeSelfieFilter('durga')">
                                 Durga Blessing
                            </button>
                            <button class="filter-btn" onclick="changeSelfieFilter('marigold')">
                                 Marigold Frame
                            </button>
                            <button class="filter-btn" onclick="changeSelfieFilter('traditional')">
                                 Traditional
                            </button>
                        </div>
                    </div>
                    <div class="selfie-actions">
                        <button class="selfie-btn capture" onclick="captureSelfie()">
                            <i class="fas fa-camera"></i> Capture
                        </button>
                        <button class="selfie-btn" onclick="switchCamera()">
                            <i class="fas fa-sync-alt"></i> Flip Camera
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(selfieModal);
}

function changeSelfieFilter(filter) {
    currentFilter = filter;

    // Update active button
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');

    // Apply filter overlay
    const overlay = document.getElementById('selfieOverlay');
    overlay.className = `selfie-overlay filter-${filter}`;

    // Update overlay content based on filter
    switch(filter) {
        case 'durga':
            overlay.innerHTML = `
                <div class="durga-blessing">
                    <div class="blessing-text">মা দুর্গার আশীর্বাদ</div>
                    <div class="om-symbol">🕉</div>
                </div>
            `;
            break;
        case 'marigold':
            overlay.innerHTML = `
                <div class="marigold-frame">
                    <div class="flower top-left"></div>
                    <div class="flower top-right"></div>
                    <div class="flower bottom-left"></div>
                    <div class="flower bottom-right"></div>
                </div>
            `;
            break;
        case 'traditional':
            overlay.innerHTML = `
                <div class="traditional-frame">
                    <div class="pattern-border"></div>
                    <div class="festival-text">শুভ দুর্গাপূজা</div>
                </div>
            `;
            break;
        default:
            overlay.innerHTML = '';
    }

    showToast(`Filter applied: ${filter}`, 'info');
}

function captureSelfie() {
    const video = document.getElementById('selfieVideo');
    const canvas = document.getElementById('selfieCanvas');
    const overlay = document.getElementById('selfieOverlay');
    const context = canvas.getContext('2d');

    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame
    context.drawImage(video, 0, 0);

    // Add filter overlay (simplified version)
    if (currentFilter !== 'none') {
        context.fillStyle = 'rgba(255, 215, 0, 0.1)';
        context.fillRect(0, 0, canvas.width, canvas.height);

        context.fillStyle = '#FFD700';
        context.font = '24px Arial';
        context.textAlign = 'center';

        switch(currentFilter) {
            case 'durga':
                context.fillText(' Durga Ma Bless ', canvas.width/2, 50);
                break;
            case 'marigold':
                context.fillText(' Happy Durga Puja ', canvas.width/2, canvas.height - 50);
                break;
            case 'traditional':
                context.fillText('শুভ দুর্গাপূজা', canvas.width/2, 50);
                break;
        }
    }

    // Convert to blob and trigger download
    canvas.toBlob(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `puja-selfie-${Date.now()}.png`;
        a.click();
        URL.revokeObjectURL(url);

        showToast(' Selfie captured with filter!', 'success');
        awardPoints(10, 'Festival selfie');
    });

    // Flash effect
    const flash = document.createElement('div');
    flash.className = 'camera-flash';
    document.body.appendChild(flash);
    setTimeout(() => flash.remove(), 200);
}

function switchCamera() {
    showToast('Camera switch feature would toggle front/back camera', 'info');
    // In a real implementation, you would request a new stream with different facingMode
}

function closeSelfieWall() {
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        cameraStream = null;
    }

    const selfieModal = document.getElementById('selfieModal');
    if (selfieModal) {
        selfieModal.remove();
    }

    showToast('Selfie Wall closed', 'info');
}

// Expose functions to global scope for onclick handlers
window.showARVRFeatures = showARVRFeatures;
window.startARExperience = startARExperience;
window.startVRExperience = startVRExperience;
window.openSelfieWall = openSelfieWall;
window.closeAROverlay = closeAROverlay;
window.toggleARInfo = toggleARInfo;
window.captureARPhoto = captureARPhoto;
window.startVRTour = startVRTour;
window.closeVRExperience = closeVRExperience;
window.vrLookAround = vrLookAround;
window.vrGetInfo = vrGetInfo;
window.vrTakePhoto = vrTakePhoto;
window.backToVRSelection = backToVRSelection;
window.showVRInfo = showVRInfo;
window.changeSelfieFilter = changeSelfieFilter;
window.captureSelfie = captureSelfie;
window.switchCamera = switchCamera;
window.closeSelfieWall = closeSelfieWall;
// Menu Functions
function showBookmarks() {
    if (appState.bookmarked.length === 0) {
        showToast('No bookmarked pandals yet!', 'warning');
        closeSideMenu();
        return;
    }

    filterPandals('bookmarked');
    closeSideMenu();
    showSection('pandals');
    showToast(`Showing ${appState.bookmarked.length} bookmarked pandals`, 'success');
}

function showMyRoute() {
    openModal('routesModal');
    loadSavedRoutes();
    closeSideMenu();
}

function showBadges() {
    openModal('badgesModal');
    updateBadgeDisplay();
    closeSideMenu();
}

function shareApp() {
    const shareData = {
        title: 'Kolkata Durga Puja Guide 2025',
        text: 'Check out this amazing Durga Puja pandal hopping guide!',
        url: window.location.href
    };

    if (navigator.share) {
        navigator.share(shareData);
    } else {
        navigator.clipboard.writeText(window.location.href)
            .then(() => showToast('App link copied to clipboard!', 'success'))
            .catch(() => showToast('Unable to share app', 'error'));
    }

    closeSideMenu();
}

function clearAllData() {
    if (confirm('Clear all app data? This cannot be undone.')) {
        localStorage.clear();
        appState = new AppState();
        generatePandalCards();
        generateFoodCards();
        updateProgress();
        updateStats();
        showToast('All data cleared successfully!', 'success');
        closeSideMenu();
    }
}

// Modal Functions
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = 'auto';
    }
}

function closeAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.remove('active');
    });
    document.body.style.overflow = 'auto';
    hideWeatherWidget();
    hideCalendarWidget();
    closeSideMenu();
}

// Route Modal Functions
function loadSavedRoutes() {
    const savedRoutes = document.getElementById('savedRoutes');

    if (appState.routes.length === 0) {
        savedRoutes.innerHTML = `
                    <div class="route-container">
                        <h3>Heritage Circuit Route (Default)</h3>
                        <p>Traditional pandals focusing on Bengali heritage</p>
                        <div style="margin-top: 1rem;">
                            <button class="btn" onclick="loadDefaultRoute('heritage')">
                                <i class="fas fa-play"></i>
                                Start Heritage Route
                            </button>
                            <button class="btn" onclick="createRouteFromBookmarks()">
                                <i class="fas fa-heart"></i>
                                Create from Bookmarks
                            </button>
                        </div>
                    </div>
                    <div class="route-container">
                        <h3>Community Circuit Route</h3>
                        <p>Local community celebrations and modern pandals</p>
                        <div style="margin-top: 1rem;">
                            <button class="btn" onclick="loadDefaultRoute('community')">
                                <i class="fas fa-play"></i>
                                Start Community Route
                            </button>
                        </div>
                    </div>
                    <div class="route-container">
                        <h3>Theme Based Route</h3>
                        <p>Spectacular themed pandals with grand decorations</p>
                        <div style="margin-top: 1rem;">
                            <button class="btn" onclick="loadDefaultRoute('theme')">
                                <i class="fas fa-play"></i>
                                Start Theme Route
                            </button>
                        </div>
                    </div>
                `;
    } else {
        savedRoutes.innerHTML = appState.routes.map(route => `
                    <div class="route-container">
                        <h3>${route.name}</h3>
                        <p>${route.pandals.length} pandals • ${route.type} route</p>
                        <small>Created: ${new Date(route.created).toLocaleDateString()}</small>
                        <div style="margin-top: 1rem;">
                            <button class="btn" onclick="loadRoute('${route.id}')">
                                <i class="fas fa-play"></i>
                                Start Route
                            </button>
                            <button class="btn" onclick="deleteRoute('${route.id}')">
                                <i class="fas fa-trash"></i>
                                Delete
                            </button>
                            <button class="btn" onclick="shareRoute('${route.id}')">
                                <i class="fas fa-share"></i>
                                Share
                            </button>
                        </div>
                    </div>
                `).join('');
    }
}

function createNewRoute() {
    if (appState.bookmarked.length < 2) {
        showToast('Please bookmark at least 2 pandals to create a route', 'warning');
        return;
    }

    createRouteFromBookmarks();
}

function createRouteFromBookmarks() {
    if (appState.bookmarked.length === 0) {
        showToast('No bookmarked pandals to create route from', 'warning');
        return;
    }

    const routeName = prompt('Enter route name:') || `My Route ${appState.routes.length + 1}`;
    const newRoute = {
        id: Date.now().toString(),
        name: routeName,
        pandals: [...appState.bookmarked],
        type: 'custom',
        created: new Date().toISOString()
    };

    appState.routes.push(newRoute);
    appState.save();

    showToast('New route created from bookmarked pandals!', 'success');
    awardPoints(15, 'Route creation');
    loadSavedRoutes();
}

function loadDefaultRoute(type) {
    const routePandals = pandalData.filter(p => p.type === type).map(p => p.id);
    const route = {
        id: Date.now().toString(),
        name: `${type.charAt(0).toUpperCase() + type.slice(1)} Route`,
        pandals: routePandals,
        type: type,
        created: new Date().toISOString()
    };

    appState.routes.push(route);
    appState.save();

    closeModal('routesModal');
    showSection('map');
    showRouteType(type);
    showToast(`${type} route loaded! GPS tracking recommended.`, 'success');
}

function loadRoute(routeId) {
    const route = appState.routes.find(r => r.id === routeId);
    if (route) {
        closeModal('routesModal');
        showSection('map');
        showToast(`Loading ${route.name}...`, 'success');

        // Show route pandals on map
        setTimeout(() => {
            if (map) {
                // Clear existing markers
                map.eachLayer((layer) => {
                    if (layer instanceof L.CircleMarker) {
                        map.removeLayer(layer);
                    }
                });

                // Add markers for route pandals
                route.pandals.forEach((pandalId, index) => {
                    const pandal = pandalData.find(p => p.id === pandalId);
                    if (pandal) {
                        const marker = L.circleMarker([pandal.lat, pandal.lng], {
                            radius: 10,
                            fillColor: '#28a745',
                            color: '#fff',
                            weight: 2,
                            opacity: 1,
                            fillOpacity: 0.8
                        }).addTo(map);

                        const displayName = currentLanguage === 'bn' ? pandal.nameBn : pandal.name;
                        marker.bindPopup(`
                                    <div style="min-width: 200px;">
                                        <h4>${displayName}</h4>
                                        <p><strong>Stop ${index + 1}</strong> of ${route.pandals.length}</p>
                                        <button onclick="openGoogleMaps(${pandal.lat}, ${pandal.lng}, '${pandal.name}')" style="width: 100%; padding: 8px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">
                                            Navigate Here
                                        </button>
                                    </div>
                                `);
                    }
                });
            }
            showToast('Route loaded! You can now navigate to each pandal.', 'info');
        }, 1500);
    }
}

function deleteRoute(routeId) {
    if (confirm('Delete this route?')) {
        appState.routes = appState.routes.filter(r => r.id !== routeId);
        appState.save();
        showToast('Route deleted', 'success');
        loadSavedRoutes();
    }
}

function shareRoute(routeId) {
    const route = appState.routes.find(r => r.id === routeId);
    if (route && navigator.share) {
        navigator.share({
            title: `Durga Puja Route: ${route.name}`,
            text: `Check out my ${route.name} with ${route.pandals.length} pandals!`,
            url: window.location.href
        });
    } else {
        showToast('Route shared!', 'success');
    }
}

// Badge Functions
function updateBadgeDisplay() {
    const userPointsEl = document.getElementById('userPoints');
    const badgeContainer = document.getElementById('badgeContainer');
    const nextBadgeEl = document.getElementById('nextBadge');
    const progressBar = document.getElementById('badgeProgressBar');

    if (userPointsEl) {
        const pointsText = currentLanguage === 'bn' ? `মোট পয়েন্ট: ${appState.points}` : `Total Points: ${appState.points}`;
        userPointsEl.textContent = pointsText;
    }

    const achievements = [
        { id: 'first-visit', name: 'First Visit', nameBn: 'প্রথম দর্শন', requirement: 1, icon: 'fas fa-star', points: 10 },
        { id: 'heritage-explorer', name: 'Heritage Explorer', nameBn: 'ঐতিহ্য অনুসন্ধানকারী', requirement: 3, icon: 'fas fa-map-marked-alt', points: 25 },
        { id: 'photo-enthusiast', name: 'Photo Enthusiast', nameBn: 'ছবি উৎসাহী', requirement: 5, icon: 'fas fa-camera', points: 50 },
        { id: 'route-master', name: 'Route Master', nameBn: 'রুট মাস্টার', requirement: 8, icon: 'fas fa-route', points: 75 },
        { id: 'cultural-ambassador', name: 'Cultural Ambassador', nameBn: 'সাংস্কৃতিক দূত', requirement: 15, icon: 'fas fa-trophy', points: 150 },
        { id: 'pandal-champion', name: 'Pandal Champion', nameBn: 'পণ্ডেল চ্যাম্পিয়ন', requirement: 31, icon: 'fas fa-crown', points: 300 }
    ];

    let nextUnlockedBadge = null;

    if (badgeContainer) {
        badgeContainer.innerHTML = achievements.map(achievement => {
            const isUnlocked = appState.badges.includes(achievement.id) || appState.visited.length >= achievement.requirement;

            if (!isUnlocked && !nextUnlockedBadge) {
                nextUnlockedBadge = achievement;
            }

            const displayName = currentLanguage === 'bn' ? achievement.nameBn : achievement.name;

            return `
                        <div class="badge ${isUnlocked ? '' : 'locked'}">
                            <i class="${achievement.icon}"></i>
                            <span>${displayName}</span>
                        </div>
                    `;
        }).join('');
    }

    if (nextUnlockedBadge && progressBar && nextBadgeEl) {
        const progress = (appState.visited.length / nextUnlockedBadge.requirement) * 100;
        progressBar.style.width = `${Math.min(progress, 100)}%`;

        const nextBadgeName = currentLanguage === 'bn' ? nextUnlockedBadge.nameBn : nextUnlockedBadge.name;
        const nextBadgeText = currentLanguage === 'bn'
            ? `পরবর্তী ব্যাজ: ${nextBadgeName} (${nextUnlockedBadge.requirement}টি পণ্ডেল দেখুন)`
            : `Next Badge: ${nextBadgeName} (Visit ${nextUnlockedBadge.requirement} pandals)`;
        nextBadgeEl.textContent = nextBadgeText;
    } else if (nextBadgeEl && progressBar) {
        progressBar.style.width = '100%';
        const allCompleteText = currentLanguage === 'bn'
            ? 'সব ব্যাজ আনলক হয়েছে! আপনি একজন পণ্ডেল চ্যাম্পিয়ন!'
            : 'All badges unlocked! You are a Pandal Champion!';
        nextBadgeEl.textContent = allCompleteText;
    }
}

// Utility Functions
function awardPoints(points, reason) {
    appState.points += points;
    appState.save();
    updateStats();
}

function checkAchievements() {
    const visited = appState.visited.length;

    const achievements = [
        { count: 1, name: 'first-visit', displayName: 'First Visit', points: 10 },
        { count: 3, name: 'heritage-explorer', displayName: 'Heritage Explorer', points: 25 },
        { count: 5, name: 'photo-enthusiast', displayName: 'Photo Enthusiast', points: 50 },
        { count: 8, name: 'route-master', displayName: 'Route Master', points: 75 },
        { count: 15, name: 'cultural-ambassador', displayName: 'Cultural Ambassador', points: 150 },
        { count: 31, name: 'pandal-champion', displayName: 'Pandal Champion', points: 300 }
    ];

    achievements.forEach(achievement => {
        if (visited === achievement.count && !appState.badges.includes(achievement.name)) {
            appState.badges.push(achievement.name);
            awardPoints(achievement.points, achievement.displayName);
            showToast(` Achievement Unlocked: ${achievement.displayName}! +${achievement.points} points`, 'success');
        }
    });

    appState.save();
}

function updateProgress() {
    const total = pandalData.length;
    const visited = appState.visited.length;
    const percentage = total > 0 ? Math.round((visited / total) * 100) : 0;

    const progressBar = document.getElementById('routeProgressBar');
    const progressText = document.getElementById('progressText');

    if (progressBar) {
        progressBar.style.width = `${percentage}%`;
    }

    if (progressText) {
        const text = currentLanguage === 'en'
            ? `${visited} of ${total} pandals visited (${percentage}% Complete)`
            : `${total}টি পণ্ডেলের মধ্যে ${visited}টি পরিদর্শিত (${percentage}% সম্পূর্ণ)`;
        progressText.innerHTML = `<span>${text}</span>`;
    }
}

function updateStats() {
    const visitedStat = document.getElementById('visitedStat');
    const bookmarkedStat = document.getElementById('bookmarkedStat');
    const userPointsStat = document.getElementById('userPointsStat');

    if (visitedStat) visitedStat.textContent = appState.visited.length;
    if (bookmarkedStat) bookmarkedStat.textContent = appState.bookmarked.length;
    if (userPointsStat) userPointsStat.textContent = appState.points;
}

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    if (toast) {
        toast.textContent = message;
        toast.className = `toast show ${type}`;

        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
}

// Cleanup
window.addEventListener('beforeunload', function() {
    if (watchId) {
        navigator.geolocation.clearWatch(watchId);
    }
});

// Create install button
function createInstallButton() {
    installButton = document.createElement('button');
    installButton.textContent = 'Install App';
    installButton.className = 'install-btn';
    installButton.style.cssText = `
        position: fixed;
        bottom: 90px;
        right: 20px;
        background: linear-gradient(135deg, #28a745, #20c997);
        color: white;
        border: none;
        padding: 12px 20px;
        border-radius: 25px;
        cursor: pointer;
        font-weight: 600;
        box-shadow: 0 4px 15px rgba(40, 167, 69, 0.3);
        z-index: 1000;
        transition: all 0.3s ease;
        display: none;
    `;

    installButton.addEventListener('mouseenter', () => {
        installButton.style.transform = 'scale(1.05)';
    });

    installButton.addEventListener('mouseleave', () => {
        installButton.style.transform = 'scale(1)';
    });

    installButton.addEventListener('click', installApp);
    document.body.appendChild(installButton);
}

// Handle the beforeinstallprompt event
window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent the mini-infobar from appearing on mobile
    e.preventDefault();

    // Stash the event so it can be triggered later
    deferredPrompt = e;

    // Show install button
    if (installButton) {
        installButton.style.display = 'block';
    }

    // Show toast notification
    showToast('This app can be installed on your device!', 'info');
});

// Install the app
function installApp() {
    if (deferredPrompt) {
        // Show the install prompt
        deferredPrompt.prompt();

        // Wait for the user to respond to the prompt
        deferredPrompt.userChoice.then((choiceResult) => {
            if (choiceResult.outcome === 'accepted') {
                showToast('App installation started!', 'success');
            } else {
                showToast('App installation declined', 'info');
            }

            // Reset the deferred prompt variable
            deferredPrompt = null;

            // Hide install button
            if (installButton) {
                installButton.style.display = 'none';
            }
        });
    } else {
        // Fallback for browsers that don't support PWA installation
        showToast('Your browser doesn\'t support app installation. You can bookmark this page instead!', 'warning');
    }
}

// Handle app installation
window.addEventListener('appinstalled', (e) => {
    showToast('App successfully installed!', 'success');

    // Hide install button
    if (installButton) {
        installButton.style.display = 'none';
    }

    // Track installation analytics (optional)
    console.log('PWA was installed');
});

// Check if app is already installed
function checkIfAppInstalled() {
    // For standalone mode (app is installed)
    if (window.matchMedia('(display-mode: standalone)').matches) {
        console.log('App is running in standalone mode');
        return true;
    }

    // For iOS Safari
    if (window.navigator.standalone === true) {
        console.log('App is running in iOS standalone mode');
        return true;
    }

    return false;
}

// Service Worker Registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
            .then((registration) => {
                console.log('SW registered: ', registration);
            })
            .catch((registrationError) => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}

// Initialize PWA features
function initializePWA() {
    // Create install button
    createInstallButton();

    // Check if app is already installed
    const isInstalled = checkIfAppInstalled();

    if (isInstalled) {
        // Hide install button if app is already installed
        if (installButton) {
            installButton.style.display = 'none';
        }

        // Add special styling for installed app
        document.body.classList.add('pwa-installed');
    }

    // Handle online/offline status
    handleOnlineStatus();
}

// Handle online/offline status
function handleOnlineStatus() {
    function updateOnlineStatus() {
        const isOnline = navigator.onLine;

        if (!isOnline) {
            showToast('You are offline. Some features may not work.', 'warning');
        } else {
            showToast('You are back online!', 'success');
        }
    }

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
}

// Add to existing DOMContentLoaded event listener
document.addEventListener('DOMContentLoaded', function() {
    // Your existing initialization code...
    initializeApp();

    // Initialize PWA features
    initializePWA();
});

// Make functions globally available
window.installApp = installApp;
// Add these to your existing global function declarations at the very end of the file
// Find the section where you have all the "window.functionName = functionName;" declarations
// and add these three lines:

window.openAboutMe = openAboutMe;
window.showAboutMeModal = showAboutMeModal;
window.visitPortfolio = visitPortfolio;
// Add to global declarations at the end
window.openAboutMe = openAboutMe;
window.showAboutMeModal = showAboutMeModal;
window.visitPortfolio = visitPortfolio;
// Enhanced Step Counter JavaScript with Activity Detection and Dynamic Backgrounds

// Step Counter Variables
let stepCount = parseInt(localStorage.getItem('todaySteps')) || 0;
let stepGoal = parseInt(localStorage.getItem('stepGoal')) || 10000;
let isStepTracking = false;
let lastAcceleration = { x: 0, y: 0, z: 0 };
let stepThreshold = 1.2;
let runningThreshold = 2.5;
let currentActivityState = 'idle'; // idle, walking, running
let activityTimer = null;
let lastStepTime = 0;
let stepInterval = 0;

// Activity Detection Variables
let accelerationHistory = [];
let maxHistorySize = 10;
let activityCheckInterval = null;

// Check if it's a new day and reset steps if needed
function checkNewDay() {
    const lastDate = localStorage.getItem('lastStepDate');
    const today = new Date().toDateString();

    if (lastDate !== today) {
        stepCount = 0;
        localStorage.setItem('todaySteps', stepCount);
        localStorage.setItem('lastStepDate', today);
    }
}

// Initialize step counter on page load
function initializeStepCounter() {
    checkNewDay();
    updateStepDisplay();
}

// Step Counter Functions
function showStepCounter() {
    if (typeof openModal === 'function') {
        openModal('stepCounterModal');
    }
    updateStepDisplay();
    generateStepBadges();
    updateActivityState();
    if (typeof closeSideMenu === 'function') {
        closeSideMenu();
    }
}

function updateStepDisplay() {
    const stepCountElement = document.getElementById('todaySteps');
    const stepTargetElement = document.getElementById('stepTarget');
    const stepProgressCircle = document.getElementById('stepProgressCircle');

    if (stepCountElement) {
        stepCountElement.textContent = stepCount.toLocaleString();
    }

    if (stepTargetElement) {
        stepTargetElement.textContent = stepGoal.toLocaleString();
    }

    // Update progress ring
    if (stepProgressCircle) {
        const progress = Math.min((stepCount / stepGoal) * 100, 100);
        const circumference = 314; // 2 * Math.PI * 50
        const offset = circumference - (progress / 100) * circumference;
        stepProgressCircle.style.strokeDashoffset = offset;

        // Update color based on progress
        if (progress >= 100) {
            stepProgressCircle.style.stroke = '#28a745';
        } else if (progress >= 75) {
            stepProgressCircle.style.stroke = '#ffc107';
        } else {
            stepProgressCircle.style.stroke = '#007bff';
        }
    }

    // Update stats
    const calories = Math.round(stepCount * 0.04);
    const distance = (stepCount * 0.0008).toFixed(1);
    const activeMins = Math.round(stepCount / 100);

    const caloriesElement = document.getElementById('caloriesBurned');
    const distanceElement = document.getElementById('distanceWalked');
    const activeMinsElement = document.getElementById('activeMins');

    if (caloriesElement) caloriesElement.textContent = calories;
    if (distanceElement) distanceElement.textContent = distance;
    if (activeMinsElement) activeMinsElement.textContent = activeMins;

    // Update tracking button
    updateTrackingButton();

    // Update activity display
    updateActivityDisplay();
}

function updateTrackingButton() {
    const trackBtn = document.getElementById('stepTrackBtn');
    if (!trackBtn) return;

    if (isStepTracking) {
        trackBtn.innerHTML = '<i class="fas fa-pause"></i><span data-en="Stop Tracking" data-bn="ট্র্যাকিং বন্ধ করুন">Stop Tracking</span>';
        trackBtn.style.background = 'linear-gradient(135deg, #dc3545, #c82333)';
    } else {
        trackBtn.innerHTML = '<i class="fas fa-play"></i><span data-en="Start Tracking" data-bn="ট্র্যাকিং শুরু করুন">Start Tracking</span>';
        trackBtn.style.background = 'linear-gradient(135deg, var(--accent-color), var(--accent-secondary))';
    }

    // Update language if needed
    if (typeof updateLanguage === 'function') {
        updateLanguage();
    }
}

function toggleStepTracking() {
    if (isStepTracking) {
        stopStepTracking();
    } else {
        startStepTracking();
    }
}

function startStepTracking() {
    if (!window.DeviceMotionEvent) {
        if (typeof showToast === 'function') {
            showToast('Step tracking not supported on this device', 'warning');
        } else {
            alert('Step tracking not supported on this device');
        }
        return;
    }

    isStepTracking = true;
    currentActivityState = 'idle';

    // Request device motion permission on iOS
    if (typeof DeviceMotionEvent.requestPermission === 'function') {
        DeviceMotionEvent.requestPermission()
            .then(response => {
                if (response === 'granted') {
                    initializeMotionTracking();
                } else {
                    if (typeof showToast === 'function') {
                        showToast('Motion permission denied', 'warning');
                    } else {
                        alert('Motion permission denied');
                    }
                    stopStepTracking();
                }
            })
            .catch(error => {
                console.error('Permission request error:', error);
                stopStepTracking();
            });
    } else {
        initializeMotionTracking();
    }
}

function initializeMotionTracking() {
    window.addEventListener('devicemotion', handleDeviceMotion);

    // Start activity detection
    startActivityDetection();

    if (typeof showToast === 'function') {
        showToast('Step tracking started! Start walking during pandal hopping', 'success');
    }
    updateStepDisplay();
}

function stopStepTracking() {
    isStepTracking = false;
    currentActivityState = 'idle';

    window.removeEventListener('devicemotion', handleDeviceMotion);
    stopActivityDetection();

    if (typeof showToast === 'function') {
        showToast('Step tracking stopped', 'info');
    }
    updateStepDisplay();
    updateActivityState('idle');
}

function handleDeviceMotion(event) {
    if (!event.accelerationIncludingGravity) return;

    const { x, y, z } = event.accelerationIncludingGravity;
    const acceleration = Math.sqrt(x * x + y * y + z * z);

    // Add to acceleration history for activity detection
    accelerationHistory.push({
        acceleration,
        timestamp: Date.now()
    });

    // Keep history size manageable
    if (accelerationHistory.length > maxHistorySize) {
        accelerationHistory.shift();
    }

    // Calculate movement delta
    const lastAccelMagnitude = Math.sqrt(
        lastAcceleration.x ** 2 + lastAcceleration.y ** 2 + lastAcceleration.z ** 2
    );
    const deltaAcceleration = Math.abs(acceleration - lastAccelMagnitude);

    // Detect steps
    if (deltaAcceleration > stepThreshold) {
        detectStep(deltaAcceleration);
    }

    lastAcceleration = { x, y, z };
}

function detectStep(deltaAcceleration) {
    const currentTime = Date.now();

    // Avoid duplicate step detection (minimum 300ms between steps)
    if (currentTime - lastStepTime < 300) {
        return;
    }

    // Calculate step interval for activity classification
    if (lastStepTime > 0) {
        stepInterval = currentTime - lastStepTime;
    }

    lastStepTime = currentTime;

    incrementStepCount();

    // Update activity based on step frequency and acceleration
    updateActivityBasedOnMovement(deltaAcceleration, stepInterval);
}

function incrementStepCount() {
    stepCount++;
    localStorage.setItem('todaySteps', stepCount);

    // Update display if modal is open
    const stepModal = document.getElementById('stepCounterModal');
    if (stepModal && stepModal.classList.contains('active')) {
        updateStepDisplay();
    }

    // Check for step achievements
    checkStepAchievements();

    // Award points for every 100 steps
    if (stepCount % 100 === 0) {
        if (typeof awardPoints === 'function') {
            awardPoints(1, 'Walking milestone');
        }
    }

    // Show milestone notifications
    if (stepCount === stepGoal) {
        const message = ' Daily step goal achieved! ' + stepGoal + ' steps completed!';
        if (typeof showToast === 'function') {
            showToast(message, 'success');
        } else {
            console.log(message);
        }
    } else if (stepCount % 1000 === 0) {
        const message = ' ' + stepCount + ' steps reached!';
        if (typeof showToast === 'function') {
            showToast(message, 'info');
        }
    }
}

function updateActivityBasedOnMovement(deltaAcceleration, interval) {
    let newActivity = 'idle';

    // Determine activity based on acceleration and step frequency
    if (deltaAcceleration > runningThreshold && interval < 600) {
        newActivity = 'running';
    } else if (deltaAcceleration > stepThreshold && interval < 1200) {
        newActivity = 'walking';
    }

    // Update activity state if changed
    if (newActivity !== currentActivityState) {
        updateActivityState(newActivity);
    }

    // Reset to idle after period of inactivity
    resetActivityTimer();
}

function startActivityDetection() {
    activityCheckInterval = setInterval(() => {
        const now = Date.now();
        const recentActivity = accelerationHistory.filter(
            item => now - item.timestamp < 5000
        );

        if (recentActivity.length === 0) {
            updateActivityState('idle');
        } else {
            // Analyze recent activity patterns
            const avgAcceleration = recentActivity.reduce(
                (sum, item) => sum + item.acceleration, 0
            ) / recentActivity.length;

            const variance = recentActivity.reduce((sum, item) => {
                return sum + Math.pow(item.acceleration - avgAcceleration, 2);
            }, 0) / recentActivity.length;

            // High variance indicates active movement
            if (variance > 50) {
                // Keep current activity state
            } else if (variance < 10) {
                updateActivityState('idle');
            }
        }
    }, 2000);
}

function stopActivityDetection() {
    if (activityCheckInterval) {
        clearInterval(activityCheckInterval);
        activityCheckInterval = null;
    }

    if (activityTimer) {
        clearTimeout(activityTimer);
        activityTimer = null;
    }

    accelerationHistory = [];
}

function resetActivityTimer() {
    if (activityTimer) {
        clearTimeout(activityTimer);
    }

    // Reset to idle after 3 seconds of no movement
    activityTimer = setTimeout(() => {
        updateActivityState('idle');
    }, 3000);
}

function updateActivityState(newState = null) {
    if (newState) {
        currentActivityState = newState;
    }

    const stepContainer = document.querySelector('.step-main-counter');
    if (!stepContainer) return;

    // Remove existing activity classes
    stepContainer.classList.remove('idle', 'walking', 'running', 'background-transition');

    // Add transition effect
    stepContainer.classList.add('background-transition');

    // Add new activity class after brief delay for smooth transition
    setTimeout(() => {
        stepContainer.classList.add(currentActivityState);
        stepContainer.classList.remove('background-transition');
    }, 100);

    // Update activity status indicator
    updateActivityStatusIndicator();
}

function updateActivityStatusIndicator() {
    let statusElement = document.querySelector('.activity-status');

    // Create status indicator if it doesn't exist
    if (!statusElement) {
        statusElement = document.createElement('div');
        statusElement.className = 'activity-status';

        const stepContainer = document.querySelector('.step-main-counter');
        if (stepContainer) {
            stepContainer.appendChild(statusElement);
        }
    }

    // Remove existing activity classes
    statusElement.classList.remove('idle', 'walking', 'running');

    // Add current activity class
    statusElement.classList.add(currentActivityState);

    // Update content based on activity and language
    const isBengali = (typeof currentLanguage !== 'undefined' && currentLanguage === 'bn');
    let statusText = '';
    let statusIcon = '';

    switch (currentActivityState) {
        case 'walking':
            statusText = isBengali ? 'হাঁটছেন' : 'Walking';
            statusIcon = 'fas fa-walking';
            break;
        case 'running':
            statusText = isBengali ? 'দৌড়াচ্ছেন' : 'Running';
            statusIcon = 'fas fa-running';
            break;
        default:
            statusText = isBengali ? 'স্থির' : 'Idle';
            statusIcon = 'fas fa-pause-circle';
    }

    statusElement.innerHTML = '<i class="' + statusIcon + '"></i><span>' + statusText + '</span>';
}

function updateActivityDisplay() {
    updateActivityState();
}

function resetDailySteps() {
    const confirmMessage = typeof currentLanguage !== 'undefined' && currentLanguage === 'bn'
        ? 'আজকের স্টেপ কাউন্ট রিসেট করবেন? এটি পূর্বাবস্থায় ফেরানো যাবে না।'
        : 'Reset today\'s step count? This cannot be undone.';

    if (confirm(confirmMessage)) {
        stepCount = 0;
        localStorage.setItem('todaySteps', stepCount);
        updateStepDisplay();
        updateActivityState('idle');

        const message = typeof currentLanguage !== 'undefined' && currentLanguage === 'bn'
            ? 'দৈনিক স্টেপ রিসেট হয়েছে'
            : 'Daily steps reset';

        if (typeof showToast === 'function') {
            showToast(message, 'info');
        }
    }
}

function setStepGoal() {
    const promptMessage = typeof currentLanguage !== 'undefined' && currentLanguage === 'bn'
        ? 'আপনার দৈনিক স্টেপ লক্ষ্য দিন:'
        : 'Enter your daily step goal:';

    const newGoal = prompt(promptMessage, stepGoal);

    if (newGoal && !isNaN(newGoal) && parseInt(newGoal) > 0) {
        stepGoal = parseInt(newGoal);
        localStorage.setItem('stepGoal', stepGoal);
        updateStepDisplay();

        const message = typeof currentLanguage !== 'undefined' && currentLanguage === 'bn'
            ? 'স্টেপ লক্ষ্য সেট করা হয়েছে: ' + stepGoal.toLocaleString()
            : 'Step goal set to ' + stepGoal.toLocaleString();

        if (typeof showToast === 'function') {
            showToast(message, 'success');
        }
    }
}

function generateStepBadges() {
    const stepBadges = [
        { steps: 1000, name: 'First Steps', nameBn: 'প্রথম পদক্ষেপ', icon: 'fas fa-baby' },
        { steps: 2500, name: 'Getting Active', nameBn: 'সক্রিয় হচ্ছেন', icon: 'fas fa-seedling' },
        { steps: 5000, name: 'Walker', nameBn: 'হাঁটুয়ে', icon: 'fas fa-walking' },
        { steps: 7500, name: 'Strider', nameBn: 'দ্রুত হাঁটুয়ে', icon: 'fas fa-shoe-prints' },
        { steps: 10000, name: 'Daily Goal', nameBn: 'দৈনিক লক্ষ্য', icon: 'fas fa-target' },
        { steps: 12500, name: 'Over Achiever', nameBn: 'লক্ষ্যের বেশি', icon: 'fas fa-medal' },
        { steps: 15000, name: 'Step Master', nameBn: 'পদক্ষেপ মাস্টার', icon: 'fas fa-star' },
        { steps: 20000, name: 'Marathon Walker', nameBn: 'ম্যারাথন হাঁটুয়ে', icon: 'fas fa-trophy' },
        { steps: 25000, name: 'Ultra Walker', nameBn: 'আল্ট্রা হাঁটুয়ে', icon: 'fas fa-crown' }
    ];

    const badgeContainer = document.getElementById('stepBadges');
    if (!badgeContainer) return;

    const isBengali = (typeof currentLanguage !== 'undefined' && currentLanguage === 'bn');

    badgeContainer.innerHTML = '';

    stepBadges.forEach(badge => {
        const badgeElement = document.createElement('div');
        badgeElement.className = stepCount >= badge.steps ? 'step-badge' : 'step-badge locked';

        const badgeName = isBengali ? badge.nameBn : badge.name;
        const badgeSteps = badge.steps.toLocaleString();

        badgeElement.innerHTML = `
            <i class="${badge.icon}"></i>
            <span>${badgeName}</span>
            <small>(${badgeSteps})</small>
        `;

        badgeContainer.appendChild(badgeElement);
    });
}

function checkStepAchievements() {
    const achievements = [1000, 2500, 5000, 7500, 10000, 12500, 15000, 20000, 25000];

    achievements.forEach(milestone => {
        const achievementKey = 'step_achievement_' + milestone;

        if (stepCount >= milestone && !localStorage.getItem(achievementKey)) {
            localStorage.setItem(achievementKey, 'true');

            // Award points for achievement
            if (typeof awardPoints === 'function') {
                const points = Math.floor(milestone / 1000);
                awardPoints(points, 'Step Achievement: ' + milestone.toLocaleString() + ' steps');
            }

            // Show achievement notification
            const message = ' Achievement unlocked: ' + milestone.toLocaleString() + ' steps!';
            if (typeof showToast === 'function') {
                showToast(message, 'success');
            }
        }
    });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeStepCounter);
} else {
    initializeStepCounter();
}

// Clean up on page unload
window.addEventListener('beforeunload', () => {
    if (isStepTracking) {
        stopStepTracking();
    }
});

// Expose functions globally for use in HTML
window.showStepCounter = showStepCounter;
window.toggleStepTracking = toggleStepTracking;
window.resetDailySteps = resetDailySteps;
window.setStepGoal = setStepGoal;
/**
 * Opens the Google Review form in a new tab
 */
function openGoogleReviewForm() {
    // Confirm before leaving the app
    const confirmOpen = confirm(
        currentLanguage === 'bn'
            ? 'আপনি কি গুগল রিভিউ ফর্মে যেতে চান? এটি একটি নতুন ট্যাবে খুলবে।'
            : 'Do you want to open the Google Review form? This will open in a new tab.'
    );

    if (confirmOpen) {
        // Open Google Review form in new tab
        window.open('https://docs.google.com/forms/d/e/1FAIpQLSd0XS2HSbfIkQUuovIavUG-1qvxIwJRswDw6HH4WdelVpxfqg/viewform?usp=dialog', '_blank');

        // Show toast notification
        const message = currentLanguage === 'bn'
            ? 'রিভিউ ফর্ম নতুন ট্যাবে খোলা হচ্ছে... আপনার মতামত দিন!'
            : 'Opening review form in new tab... Please share your feedback!';
        showToast(message, 'info');

        // Close side menu
        closeSideMenu();

        // Award points for engagement
        awardPoints(5, 'Review form opened');
    }
}

// Make function globally available (add this at the end with other global functions)
window.openGoogleReviewForm = openGoogleReviewForm;
// Additional JavaScript functions to integrate with existing code

// Update your existing createPandalCard function to include real-time features
function createPandalCardEnhanced(pandal) {
    const div = document.createElement('div');
    const isBookmarked = appState.bookmarked.includes(pandal.id);
    const isVisited = appState.visited.includes(pandal.id);

    div.className = `pandal-card ${isVisited ? 'visited' : ''}`;
    div.setAttribute('data-type', pandal.type);
    div.setAttribute('data-name', pandal.name.toLowerCase());
    div.setAttribute('data-location', pandal.area.toLowerCase());
    div.setAttribute('data-accessible', pandal.accessible);
    div.setAttribute('data-id', pandal.id);

    // Get real-time crowd data
    const crowdCount = crowdTracker ? crowdTracker.crowdData.get(pandal.id)?.length || 0 : 0;
    let crowdLevel, crowdText;
    if (crowdCount < 5) {
        crowdLevel = 'low';
        crowdText = currentLanguage === 'bn' ? 'কম' : 'Low';
    } else if (crowdCount < 15) {
        crowdLevel = 'medium';
        crowdText = currentLanguage === 'bn' ? 'মাঝারি' : 'Medium';
    } else {
        crowdLevel = 'high';
        crowdText = currentLanguage === 'bn' ? 'বেশি' : 'High';
    }

    const displayName = currentLanguage === 'bn' ? pandal.nameBn : pandal.name;
    const displayArea = currentLanguage === 'bn' ? pandal.areaBn : pandal.area;
    const displayTheme = currentLanguage === 'bn' ? pandal.themeBn : pandal.theme;

    // Get user reviews count
    const reviewsCount = userContent ? userContent.getPandalReviews(pandal.id).length : 0;
    const avgRating = userContent ? calculateAverageRating(pandal.id) : 0;

    div.innerHTML = `
        <div class="crowd-indicator crowd-${crowdLevel}">
            <span class="live-indicator">
                <span class="live-dot"></span>
                Live
            </span>
            ${crowdText}
        </div>
        <div class="pandal-name">${displayName}</div>
        <div class="pandal-type">${pandal.type.charAt(0).toUpperCase() + pandal.type.slice(1)}</div>
        
        ${avgRating > 0 ? `
            <div class="user-rating">
                <span class="stars">${'★'.repeat(Math.floor(avgRating))}${'☆'.repeat(5-Math.floor(avgRating))}</span>
                <span class="rating-text">${avgRating.toFixed(1)} (${reviewsCount} reviews)</span>
            </div>
        ` : ''}
        
        <div class="pandal-details">
            <div class="detail-item">
                <i class="fas fa-map-marker-alt detail-icon"></i>
                <span>${displayArea}</span>
            </div>
            <div class="detail-item">
                <i class="fas fa-palette detail-icon"></i>
                <span>${displayTheme}</span>
            </div>
            <div class="detail-item">
                <i class="fas fa-clock detail-icon"></i>
                <span>${pandal.hours}</span>
            </div>
        </div>
        
        <div style="margin-top: 1rem;">
            <button class="btn ${isBookmarked ? 'bookmarked' : ''}" onclick="toggleBookmark('${pandal.id}')">
                <i class="fas fa-heart"></i>
                <span>${isBookmarked ? 'Bookmarked' : 'Bookmark'}</span>
            </button>
            <button class="btn ${isVisited ? 'visited-btn' : ''}" onclick="markVisited('${pandal.id}')">
                <i class="fas fa-${isVisited ? 'check-circle' : 'check'}"></i>
                <span>${isVisited ? 'Visited' : 'Mark Visited'}</span>
            </button>
            <button class="btn" onclick="showReviewForm('${pandal.id}', '${displayName}')">
                <i class="fas fa-star"></i>
                <span>Review</span>
            </button>
            <button class="btn" onclick="showUserPhotos('${pandal.id}')">
                <i class="fas fa-images"></i>
                <span>Photos</span>
            </button>
        </div>
        
        <div class="user-reviews" id="reviews-${pandal.id}" style="margin-top: 1rem;">
            <div class="reviews-preview" id="reviewsPreview-${pandal.id}">
                <!-- Reviews preview will be loaded here -->
            </div>
        </div>
    `;

    // Load review preview
    loadReviewPreview(pandal.id);

    return div;
}

// Calculate average rating for a pandal
function calculateAverageRating(pandalId) {
    if (!userContent) return 0;

    const reviews = userContent.getPandalReviews(pandalId);
    if (reviews.length === 0) return 0;

    const sum = reviews.reduce((total, review) => total + review.rating, 0);
    return sum / reviews.length;
}

// Load review preview for pandal card
function loadReviewPreview(pandalId) {
    if (!userContent) return;

    const reviews = userContent.getPandalReviews(pandalId);
    const previewContainer = document.getElementById(`reviewsPreview-${pandalId}`);

    if (!previewContainer || reviews.length === 0) return;

    const latestReview = reviews[0];
    previewContainer.innerHTML = `
        <div class="review-preview">
            <div class="review-stars">${'★'.repeat(latestReview.rating)}${'☆'.repeat(5-latestReview.rating)}</div>
            <p class="review-text">"${latestReview.comment.substring(0, 100)}${latestReview.comment.length > 100 ? '...' : ''}"</p>
            <small>- ${latestReview.username}</small>
            ${reviews.length > 1 ? `<button class="btn-link" onclick="showAllReviews('${pandalId}')">View all ${reviews.length} reviews</button>` : ''}
        </div>
    `;
}

// Show all reviews for a pandal
function showAllReviews(pandalId) {
    const pandal = pandalData.find(p => p.id === pandalId);
    const displayName = currentLanguage === 'bn' ? pandal.nameBn : pandal.name;

    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.id = 'allReviewsModal';

    const reviews = userContent.getPandalReviews(pandalId);

    modal.innerHTML = `
        <div class="modal-content">
            <button class="modal-close" onclick="closeModal('allReviewsModal')">&times;</button>
            <h2>Reviews: ${displayName}</h2>
            <div class="reviews-list">
                ${reviews.map(review => `
                    <div class="review-item">
                        <div class="review-header">
                            <div class="reviewer-info">
                                <span class="reviewer-name">${review.username}</span>
                                <span class="review-rating">${'★'.repeat(review.rating)}${'☆'.repeat(5-review.rating)}</span>
                            </div>
                            <span class="review-date">${new Date(review.timestamp).toLocaleDateString()}</span>
                        </div>
                        <p class="review-text">${review.comment}</p>
                        <div class="review-helpful">
                            <button class="helpful-btn" onclick="markHelpful('${review.id}')">
                                <i class="fas fa-thumbs-up"></i> Helpful (${review.helpful || 0})
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;

    document.body.appendChild(modal);
}

// Show user photos for a pandal
function showUserPhotos(pandalId) {
    if (!userContent) return;

    const pandal = pandalData.find(p => p.id === pandalId);
    const displayName = currentLanguage === 'bn' ? pandal.nameBn : pandal.name;
    const photos = userContent.userPhotos.filter(photo => photo.pandalId === pandalId);

    const modal = document.getElementById('userPhotosModal');
    const gallery = document.getElementById('userPhotoGallery');

    modal.querySelector('h2').textContent = `Photos: ${displayName}`;

    if (photos.length === 0) {
        gallery.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 2rem;">
                <p>No photos yet. Be the first to share!</p>
                <button class="btn" onclick="showPhotoUploadForm('${pandalId}')">Upload Photo</button>
            </div>
        `;
    } else {
        gallery.innerHTML = photos.map(photo => `
            <div class="user-photo-item" onclick="showPhotoDetail('${photo.id}')">
                <img src="${photo.photo}" alt="User photo">
                <div class="photo-overlay">
                    <div>${photo.caption || 'No caption'}</div>
                    <small>by ${photo.username}</small>
                </div>
                <div class="photo-likes">
                    <i class="fas fa-heart"></i> ${photo.likes || 0}
                </div>
            </div>
        `).join('');

        gallery.innerHTML += `
            <div class="user-photo-item upload-new" onclick="showPhotoUploadForm('${pandalId}')" style="background: linear-gradient(135deg, var(--accent-color), var(--accent-secondary)); display: flex; align-items: center; justify-content: center; color: white; cursor: pointer;">
                <div style="text-align: center;">
                    <i class="fas fa-plus" style="font-size: 2rem; margin-bottom: 0.5rem;"></i>
                    <div>Add Photo</div>
                </div>
            </div>
        `;
    }

    openModal('userPhotosModal');
}

// Show photo upload form
function showPhotoUploadForm(pandalId) {
    document.getElementById('photoPandalId').value = pandalId;
    closeModal('userPhotosModal');
    openModal('photoUploadModal');

    // Setup photo preview
    const photoInput = document.getElementById('photoFile');
    const preview = document.getElementById('photoPreview');
    const previewImg = document.getElementById('previewImage');

    photoInput.onchange = function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                previewImg.src = e.target.result;
                preview.style.display = 'block';
            };
            reader.readAsDataURL(file);
        }
    };
}

// Upload user photo
function uploadUserPhoto(event) {
    event.preventDefault();

    const pandalId = document.getElementById('photoPandalId').value;
    const photoFile = document.getElementById('photoFile').files[0];
    const caption = document.getElementById('photoCaption').value;

    if (!photoFile) {
        showToast('Please select a photo', 'warning');
        return;
    }

    userContent.addUserPhoto(pandalId, photoFile, caption).then(() => {
        closeModal('photoUploadModal');
        document.getElementById('photoUploadForm').reset();
        document.getElementById('photoPreview').style.display = 'none';

        // Refresh the photos modal if it was open
        if (document.getElementById('userPhotosModal').classList.contains('active')) {
            showUserPhotos(pandalId);
        }

        // Update the pandal card
        generatePandalCards();
    });
}

// Enhanced review form function
function showReviewForm(pandalId, pandalName) {
    if (!userContent) {
        userContent = new UserContentSystem();
    }
    userContent.showReviewForm(pandalId, pandalName);
}

// Notification functions
function enableNotifications() {
    if (notifications) {
        notifications.initializeNotifications().then(() => {
            document.getElementById('notificationRequest').style.display = 'none';
            showToast('Notifications enabled!', 'success');
        });
    }
}

function dismissNotifications() {
    document.getElementById('notificationRequest').style.display = 'none';
    localStorage.setItem('notificationsDismissed', 'true');
}

// Live updates toggle
function toggleLiveUpdates() {
    const panel = document.getElementById('liveUpdatesPanel');
    panel.classList.toggle('show');
}

// Initialize real-time features in your existing initializeApp function
function initializeAppEnhanced() {
    // Your existing initialization code...

    // Initialize real-time features
    setTimeout(() => {
        initializeRealTimeFeatures();

        // Show notification request if not dismissed
        if (!localStorage.getItem('notificationsDismissed')) {
            setTimeout(() => {
                document.getElementById('notificationRequest').style.display = 'block';
            }, 5000);
        }
    }, 3000);
}

// Update your existing generatePandalCards function
function generatePandalCardsEnhanced() {
    const grid = document.getElementById('pandalGrid');
    if (!grid) return;

    grid.innerHTML = '';

    pandalData.forEach(pandal => {
        const card = createPandalCardEnhanced(pandal);
        grid.appendChild(card);
    });

    updateStats();
}
// Enhanced Badge Functions with Working Progress Bar
function updateBadgeDisplay() {
    const userPointsEl = document.getElementById('userPoints');
    const badgeContainer = document.getElementById('badgeContainer');
    const nextBadgeEl = document.getElementById('nextBadge');
    const progressBar = document.getElementById('badgeProgressBar');

    if (userPointsEl) {
        const pointsText = currentLanguage === 'bn' ? `মোট পয়েন্ট: ${appState.points}` : `Total Points: ${appState.points}`;
        userPointsEl.textContent = pointsText;
    }

    const achievements = [
        { id: 'first-visit', name: 'First Visit', nameBn: 'প্রথম দর্শন', requirement: 1, icon: 'fas fa-star', points: 10 },
        { id: 'heritage-explorer', name: 'Heritage Explorer', nameBn: 'ঐতিহ্য অনুসন্ধানকারী', requirement: 3, icon: 'fas fa-map-marked-alt', points: 25 },
        { id: 'photo-enthusiast', name: 'Photo Enthusiast', nameBn: 'ছবি উৎসাহী', requirement: 5, icon: 'fas fa-camera', points: 50 },
        { id: 'route-master', name: 'Route Master', nameBn: 'রুট মাস্টার', requirement: 8, icon: 'fas fa-route', points: 75 },
        { id: 'cultural-ambassador', name: 'Cultural Ambassador', nameBn: 'সাংস্কৃতিক দূত', requirement: 15, icon: 'fas fa-trophy', points: 150 },
        { id: 'pandal-champion', name: 'Pandal Champion', nameBn: 'প্যান্ডেল চ্যাম্পিয়ন', requirement: 31, icon: 'fas fa-crown', points: 300 }
    ];

    let nextUnlockedBadge = null;
    const visitedCount = appState.visited.length;

    if (badgeContainer) {
        badgeContainer.innerHTML = achievements.map(achievement => {
            const isUnlocked = appState.badges.includes(achievement.id) || visitedCount >= achievement.requirement;

            if (!isUnlocked && !nextUnlockedBadge) {
                nextUnlockedBadge = achievement;
            }

            const displayName = currentLanguage === 'bn' ? achievement.nameBn : achievement.name;

            return `
                <div class="badge ${isUnlocked ? '' : 'locked'}">
                    <i class="${achievement.icon}"></i>
                    <span>${displayName}</span>
                </div>
            `;
        }).join('');
    }

    // Update progress bar with animation
    if (nextUnlockedBadge && progressBar && nextBadgeEl) {
        const progress = Math.min((visitedCount / nextUnlockedBadge.requirement) * 100, 100);

        // Add shake animation class before updating
        progressBar.classList.remove('shake');

        // Update progress bar width
        setTimeout(() => {
            progressBar.style.width = `${progress}%`;

            // Add shake effect if progress changed
            if (progress > 0) {
                progressBar.classList.add('shake');
            }
        }, 100);

        const nextBadgeName = currentLanguage === 'bn' ? nextUnlockedBadge.nameBn : nextUnlockedBadge.name;
        const nextBadgeText = currentLanguage === 'bn'
            ? `পরবর্তী ব্যাজ: ${nextBadgeName} (${nextUnlockedBadge.requirement}টি প্যান্ডেল দেখুন)`
            : `Next Badge: ${nextBadgeName} (Visit ${nextUnlockedBadge.requirement} pandals)`;
        nextBadgeEl.textContent = nextBadgeText;

    } else if (nextBadgeEl && progressBar) {
        progressBar.style.width = '100%';
        progressBar.classList.add('shake');

        const allCompleteText = currentLanguage === 'bn'
            ? 'সব ব্যাজ আনলক হয়েছে! আপনি একজন প্যান্ডেল চ্যাম্পিয়ন!'
            : 'All badges unlocked! You are a Pandal Champion!';
        nextBadgeEl.textContent = allCompleteText;
    }
}

// Enhanced check achievements with proper progress bar update
function checkAchievements() {
    const visited = appState.visited.length;
    let newBadgeEarned = false;

    const achievements = [
        { count: 1, name: 'first-visit', displayName: 'First Visit', points: 10 },
        { count: 3, name: 'heritage-explorer', displayName: 'Heritage Explorer', points: 25 },
        { count: 5, name: 'photo-enthusiast', displayName: 'Photo Enthusiast', points: 50 },
        { count: 8, name: 'route-master', displayName: 'Route Master', points: 75 },
        { count: 15, name: 'cultural-ambassador', displayName: 'Cultural Ambassador', points: 150 },
        { count: 31, name: 'pandal-champion', displayName: 'Pandal Champion', points: 300 }
    ];

    achievements.forEach(achievement => {
        if (visited === achievement.count && !appState.badges.includes(achievement.name)) {
            appState.badges.push(achievement.name);
            awardPoints(achievement.points, achievement.displayName);
            showToast(` Achievement Unlocked: ${achievement.displayName}! +${achievement.points} points`, 'success');
            newBadgeEarned = true;
        }
    });

    appState.save();

    // Update badge display if modal is open or if new badge earned
    const badgeModal = document.getElementById('badgesModal');
    if (badgeModal && badgeModal.classList.contains('active') || newBadgeEarned) {
        updateBadgeDisplay();
    }
}

// Enhanced markVisited function that properly triggers badge updates
function markVisited(pandalId) {
    if (!appState.visited.includes(pandalId)) {
        appState.visited.push(pandalId);
        const pandal = pandalData.find(p => p.id === pandalId);

        awardPoints(10, 'Pandal visited');
        showToast(`Visited ${pandal.name}! +10 points`, 'success');

        appState.save();
        generatePandalCards();
        updateProgress();
        updateStats();

        // This will trigger badge updates and progress bar animation
        checkAchievements();

        // If badges modal is open, update it immediately
        const badgeModal = document.getElementById('badgesModal');
        if (badgeModal && badgeModal.classList.contains('active')) {
            setTimeout(updateBadgeDisplay, 200); // Small delay for smooth animation
        }

    } else {
        showToast('Already marked as visited', 'info');
    }
}

// Enhanced showBadges function
function showBadges() {
    openModal('badgesModal');
    // Update display after modal opens for smooth animation
    setTimeout(updateBadgeDisplay, 100);
    closeSideMenu();
}

// Add this CSS to your existing styles for the shake animation
const badgeProgressStyles = `
/* Enhanced Progress Bar with Fluid Shake Effect */
.progress-container {
    background: var(--border-color);
    border-radius: 10px;
    height: 12px;
    margin: 1rem 0;
    overflow: hidden;
    position: relative;
}

.progress-bar {
    background: linear-gradient(90deg, var(--accent-color), var(--accent-secondary));
    height: 100%;
    width: 0%;
    transition: width 0.5s ease;
    border-radius: 10px;
    position: relative;
    transform-origin: left center;
}

/* Shake animation that affects only the filled portion */
.progress-bar.shake {
    animation: fluidShake 0.6s ease-in-out;
}

@keyframes fluidShake {
    0%, 100% { 
        transform: scaleX(1) translateX(0px);
    }
    10% { 
        transform: scaleX(0.98) translateX(-2px);
    }
    20% { 
        transform: scaleX(1.02) translateX(2px);
    }
    30% { 
        transform: scaleX(0.99) translateX(-1px);
    }
    40% { 
        transform: scaleX(1.01) translateX(1px);
    }
    50% { 
        transform: scaleX(0.995) translateX(-0.5px);
    }
    60% { 
        transform: scaleX(1.005) translateX(0.5px);
    }
    70% { 
        transform: scaleX(0.998) translateX(-0.3px);
    }
    80% { 
        transform: scaleX(1.002) translateX(0.3px);
    }
    90% { 
        transform: scaleX(0.999) translateX(-0.1px);
    }
}

/* Progress bar glow effect */
.progress-bar::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
    animation: progressGlow 2s infinite;
    border-radius: 10px;
}

@keyframes progressGlow {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
}

/* Badge achievement notification */
.badge-achievement {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: linear-gradient(135deg, var(--gold), var(--marigold));
    color: white;
    padding: 2rem;
    border-radius: 20px;
    text-align: center;
    box-shadow: 0 20px 60px rgba(255, 215, 0, 0.4);
    z-index: 2001;
    animation: badgePopup 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

@keyframes badgePopup {
    0% {
        opacity: 0;
        transform: translate(-50%, -50%) scale(0.5);
    }
    100% {
        opacity: 1;
        transform: translate(-50%, -50%) scale(1);
    }
}
`;

// Add the styles to the page
if (!document.getElementById('badgeProgressStyles')) {
    const styleSheet = document.createElement('style');
    styleSheet.id = 'badgeProgressStyles';
    styleSheet.textContent = badgeProgressStyles;
    document.head.appendChild(styleSheet);
}

// Initialize badge system on page load
document.addEventListener('DOMContentLoaded', function() {
    // Update badge display after other initializations
    setTimeout(() => {
        if (document.getElementById('badgeContainer')) {
            updateBadgeDisplay();
        }
    }, 1000);
});

// Override existing functions in script.js
window.updateBadgeDisplay = updateBadgeDisplay;
window.checkAchievements = checkAchievements;
window.markVisited = markVisited;
window.showBadges = showBadges;
// Global function declarations (add to your existing global declarations)
window.showReviewForm = showReviewForm;
window.showUserPhotos = showUserPhotos;
window.showPhotoUploadForm = showPhotoUploadForm;
window.uploadUserPhoto = uploadUserPhoto;
window.showAllReviews = showAllReviews;
window.enableNotifications = enableNotifications;
window.dismissNotifications = dismissNotifications;
window.toggleLiveUpdates = toggleLiveUpdates;
window.setRating = setRating;
window.submitReview = submitReview;


// Make functions globally available
window.showSection = showSection;
window.toggleSideMenu = toggleSideMenu;
window.toggleTheme = toggleTheme;
window.toggleLanguage = toggleLanguage;
window.filterPandals = filterPandals;
window.filterFood = filterFood;
window.toggleBookmark = toggleBookmark;
window.markVisited = markVisited;
window.openGoogleMaps = openGoogleMaps;
window.getCurrentLocation = getCurrentLocation;
window.showRouteType = showRouteType;
window.optimizeRoute = optimizeRoute;
window.trackRoute = trackRoute;
window.showBookmarks = showBookmarks;
window.showMyRoute = showMyRoute;
window.showBadges = showBadges;
window.showWeatherInfo = showWeatherInfo;
window.hideWeatherWidget = hideWeatherWidget;
window.showCalendar = showCalendar;
window.hideCalendarWidget = hideCalendarWidget;
window.showThemeArchive = showThemeArchive;
window.showARVRFeatures = showARVRFeatures;
window.startARExperience = startARExperience;
window.startVRExperience = startVRExperience;
window.openSelfieWall = openSelfieWall;
window.shareApp = shareApp;
window.clearAllData = clearAllData;
window.openModal = openModal;
window.closeModal = closeModal;
window.createNewRoute = createNewRoute;
window.createRouteFromBookmarks = createRouteFromBookmarks;
window.loadDefaultRoute = loadDefaultRoute;
window.loadRoute = loadRoute;
window.deleteRoute = deleteRoute;
window.shareRoute = shareRoute;


// INTEGRATION CODE - Add this to your existing script.js file
// Add these functions and modifications to integrate the notification system

// Add to your existing initializeApp() function
function initializeAppWithNotifications() {
    // Your existing initialization code...
    initializeApp();

    // Initialize notification system
    setTimeout(() => {
        if (typeof notificationSystem !== 'undefined') {
            notificationSystem.initialize();

            // Add notification menu item
            addNotificationMenuItems();

            // Check for URL parameters from notifications
            handleNotificationDeepLinks();
        }
    }, 2000);
}

// Add notification menu items to side menu
function addNotificationMenuItems() {
    const sideMenu = document.getElementById('sideMenu');
    if (!sideMenu) return;

    const notificationMenuHTML = `
        <div class="menu-item" onclick="notificationSystem.showNotificationSettings(); closeSideMenu();">
            <i class="fas fa-bell"></i>
            <span data-en="Notification Settings" data-bn="নোটিফিকেশন সেটিংস">Notification Settings</span>
            <div class="notification-status ${Notification.permission === 'granted' ? 'enabled' : 'disabled'}" 
                 style="margin-left: auto; font-size: 0.7rem; padding: 0.2rem 0.5rem;">
                ${Notification.permission === 'granted' ? 'ON' : 'OFF'}
            </div>
        </div>
    `;

    // Insert before the clear data option
    const clearDataItem = sideMenu.querySelector('.menu-item:last-child');
    if (clearDataItem) {
        clearDataItem.insertAdjacentHTML('beforebegin', notificationMenuHTML);
    } else {
        sideMenu.insertAdjacentHTML('beforeend', notificationMenuHTML);
    }
}

// Handle deep links from notifications
function handleNotificationDeepLinks() {
    const urlParams = new URLSearchParams(window.location.search);
    const action = urlParams.get('action');
    const section = urlParams.get('section');
    const pandalId = urlParams.get('pandal');
    const event = urlParams.get('event');

    // Handle different notification actions
    switch (action) {
        case 'update':
            if (typeof updateManager !== 'undefined') {
                updateManager.applyUpdate();
            }
            break;

        case 'navigate':
            if (pandalId) {
                navigateToPandal(pandalId);
            }
            break;

        case 'bookmark':
            if (pandalId) {
                toggleBookmark(pandalId);
                showToast('Pandal bookmarked from notification!', 'success');
            }
            break;

        case 'stop_gps':
            if (typeof trackRoute === 'function') {
                // Stop GPS tracking
                isTracking = false;
                showToast('GPS tracking stopped', 'info');
            }
            break;

        case 'set_reminder':
            if (event) {
                setEventReminder(decodeURIComponent(event));
            }
            break;

        case 'route':
            showSection('map');
            break;
    }

    // Handle section navigation
    if (section) {
        showSection(section);
    }

    // Clear URL parameters after handling
    if (action || section || pandalId || event) {
        window.history.replaceState({}, document.title, window.location.pathname);
    }
}

// Navigate to specific pandal
function navigateToPandal(pandalId) {
    const pandal = pandalData.find(p => p.id === pandalId);
    if (pandal) {
        showSection('pandals');

        // Highlight the pandal card
        setTimeout(() => {
            const pandalCard = document.querySelector(`[data-id="${pandalId}"]`);
            if (pandalCard) {
                pandalCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
                pandalCard.style.border = '3px solid var(--accent-color)';
                setTimeout(() => {
                    pandalCard.style.border = '';
                }, 3000);
            }
        }, 500);

        // Show navigation options
        showToast(`Navigating to ${pandal.name}`, 'info');
        setTimeout(() => {
            openGoogleMaps(pandal.lat, pandal.lng, pandal.name);
        }, 1000);
    }
}

// Set event reminder
function setEventReminder(eventName) {
    showToast(`Reminder set for ${eventName}`, 'success');

    // Add to calendar or local storage
    const reminders = JSON.parse(localStorage.getItem('eventReminders') || '[]');
    reminders.push({
        event: eventName,
        setAt: new Date().toISOString(),
        reminderTime: Date.now() + (30 * 60 * 1000) // 30 minutes from now
    });
    localStorage.setItem('eventReminders', JSON.stringify(reminders));
}

// Enhanced markVisited function with notification
function markVisitedWithNotification(pandalId) {
    if (!appState.visited.includes(pandalId)) {
        markVisited(pandalId); // Call existing function

        const pandal = pandalData.find(p => p.id === pandalId);
        const visitedCount = appState.visited.length;

        // Send achievement notification for milestones
        if (visitedCount === 1) {
            sendAchievementNotification('first-visit', 'First Visit', 1);
        } else if (visitedCount === 5) {
            sendAchievementNotification('five-visits', 'Explorer', 5);
        } else if (visitedCount === 10) {
            sendAchievementNotification('ten-visits', 'Pandal Hopper', 10);
        } else if (visitedCount === 20) {
            sendAchievementNotification('twenty-visits', 'Puja Enthusiast', 20);
        } else if (visitedCount === 31) {
            sendAchievementNotification('all-visits', 'Pandal Champion', 31);
        }
    }
}

// Send achievement notification
function sendAchievementNotification(id, badge, count) {
    if (typeof pushNotificationService !== 'undefined') {
        pushNotificationService.sendAchievementNotification({
            id: id,
            name: badge,
            count: count,
            points: count * 10
        });
    }
}

// Enhanced GPS tracking with notifications
function trackRouteWithNotifications() {
    trackRoute(); // Call existing function

    // Send GPS tracking notification after 2 minutes
    setTimeout(() => {
        if (isTracking && typeof notificationSystem !== 'undefined') {
            notificationSystem.sendGPSTrackingNotification();
        }
    }, 2 * 60 * 1000);
}

// Weather change notification
function checkWeatherForNotifications() {
    if (typeof weatherSystem !== 'undefined') {
        weatherSystem.getWeatherData().then(data => {
            const condition = data.current.condition.en.toLowerCase();

            // Send notification for severe weather
            if (condition.includes('rain') || condition.includes('storm') || condition.includes('thunder')) {
                if (typeof notificationSystem !== 'undefined') {
                    notificationSystem.sendImmediateNotification({
                        type: 'weather_alert',
                        data: {
                            condition: data.current.condition.en,
                            description: `${condition} expected. Plan your pandal visits accordingly.`
                        }
                    });
                }
            }
        });
    }
}

// Request notification permission on first app use
function requestNotificationPermissionOnFirstUse() {
    const isFirstUse = !localStorage.getItem('appFirstUseComplete');

    if (isFirstUse) {
        // Mark first use
        localStorage.setItem('appFirstUseComplete', 'true');

        // Request permission after 30 seconds
        setTimeout(() => {
            if (typeof notificationSystem !== 'undefined') {
                notificationSystem.requestPermission();
            }
        }, 30000);
    }
}

// Enhanced app update with notification
function checkForUpdatesWithNotification() {
    if (typeof updateManager !== 'undefined') {
        const originalCheckForUpdates = updateManager.checkForUpdates;

        updateManager.checkForUpdates = async function() {
            await originalCheckForUpdates.call(this);

            // If update is available, send notification
            if (this.updateAvailable && typeof notificationSystem !== 'undefined') {
                notificationSystem.sendUpdateNotification({
                    version: this.latestVersion,
                    features: this.updateFeatures || ['Bug fixes and improvements']
                });
            }
        };
    }
}

// Show notification banner for important updates
function showNotificationBanner(message, actions = []) {
    // Remove existing banner
    const existingBanner = document.getElementById('notificationBanner');
    if (existingBanner) {
        existingBanner.remove();
    }

    const banner = document.createElement('div');
    banner.id = 'notificationBanner';
    banner.className = 'notification-banner';

    const actionsHTML = actions.map(action =>
        `<button class="banner-btn ${action.primary ? 'primary' : ''}" onclick="${action.onclick}">
            ${action.text}
        </button>`
    ).join('');

    banner.innerHTML = `
        <div class="notification-banner-content">
            <div class="notification-banner-text">${message}</div>
            <div class="notification-banner-actions">
                ${actionsHTML}
                <button class="banner-close" onclick="closeBanner()">&times;</button>
            </div>
        </div>
    `;

    document.body.appendChild(banner);

    // Show with animation
    setTimeout(() => banner.classList.add('show'), 100);

    // Auto-hide after 10 seconds
    setTimeout(() => {
        if (document.getElementById('notificationBanner')) {
            closeBanner();
        }
    }, 10000);
}

function closeBanner() {
    const banner = document.getElementById('notificationBanner');
    if (banner) {
        banner.classList.remove('show');
        setTimeout(() => banner.remove(), 300);
    }
}

// Initialize notification features when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Replace the original initialization
    initializeAppWithNotifications();

    // Request notification permission on first use
    requestNotificationPermissionOnFirstUse();

    // Check weather for notifications every hour
    setInterval(checkWeatherForNotifications, 60 * 60 * 1000);

    // Enhanced update checking
    setTimeout(checkForUpdatesWithNotification, 5000);
});

// Override existing functions with notification-enhanced versions
window.markVisited = markVisitedWithNotification;
window.trackRoute = trackRouteWithNotifications;

// Make new functions globally available
window.showNotificationBanner = showNotificationBanner;
window.closeBanner = closeBanner;
window.handleNotificationDeepLinks = handleNotificationDeepLinks;
window.navigateToPandal = navigateToPandal;
window.setEventReminder = setEventReminder;
// auth-manager.js - Add this to all your HTML files
class AuthManager {
    constructor() {
        this.MAIN_APP_URL = 'main-app.html';
        this.INDEX_URL = 'index.html';      // Landing page
        this.LOGIN_URL = 'login.html';      // NEW - dedicated login
        this.SESSION_DURATION_HOURS = 24;
    }


    // Check if user is authenticated
    isAuthenticated() {
        const isLoggedIn = localStorage.getItem('isLoggedIn');
        const userData = localStorage.getItem('userData');
        const sessionExpiry = localStorage.getItem('sessionExpiry');
        const authToken = localStorage.getItem('authToken');

        if (!isLoggedIn || !userData || !sessionExpiry || !authToken) {
            return false;
        }

        try {
            const user = JSON.parse(userData);
            const expiryDate = new Date(sessionExpiry);
            const now = new Date();

            // Check if session is still valid and user data is complete
            return now < expiryDate && user.name && user.email;
        } catch (error) {
            console.error('Session validation failed:', error);
            return false;
        }
    }

    // Get current user data
    getCurrentUser() {
        try {
            const userData = localStorage.getItem('userData');
            return userData ? JSON.parse(userData) : null;
        } catch (error) {
            return null;
        }
    }

    // Clear all authentication data
    clearAuth() {
        const keysToRemove = ['userData', 'isLoggedIn', 'authToken', 'sessionExpiry'];
        keysToRemove.forEach(key => localStorage.removeItem(key));
    }

    // Redirect to login page
    redirectToLogin() {
        window.location.replace(this.LOGIN_URL);
    }

    // Redirect to index page
    redirectToIndex() {
        window.location.replace(this.INDEX_URL);
    }

    // Redirect to main app
    redirectToMainApp() {
        window.location.replace(this.MAIN_APP_URL);
    }

    // Handle logout
    logout() {
        this.clearAuth();
        this.showToast('Logged out successfully', 'info');
        setTimeout(() => {
            this.redirectToMainApp();
        }, 1000);
    }

    // Show toast notification
    showToast(message, type = 'info') {
        // Remove existing toasts
        document.querySelectorAll('.auth-toast').forEach(toast => toast.remove());

        const toast = document.createElement('div');
        toast.className = `auth-toast ${type}`;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${this.getToastColor(type)};
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10000;
            font-family: system-ui, -apple-system, sans-serif;
            font-size: 14px;
            font-weight: 500;
            max-width: 300px;
            opacity: 0;
            transform: translateX(100%);
            transition: all 0.3s ease;
        `;
        toast.textContent = message;
        document.body.appendChild(toast);

        // Animate in
        requestAnimationFrame(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateX(0)';
        });

        // Auto remove
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 4000);
    }

    getToastColor(type) {
        const colors = {
            success: '#28a745',
            error: '#dc3545',
            warning: '#ffc107',
            info: '#17a2b8'
        };
        return colors[type] || colors.info;
    }

    // Store authentication data
    storeAuthData(userData, authToken) {
        localStorage.setItem('userData', JSON.stringify(userData));
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('authToken', authToken);
        localStorage.setItem('sessionExpiry',
            new Date(Date.now() + this.SESSION_DURATION_HOURS * 60 * 60 * 1000).toISOString()
        );
    }
}

// Initialize auth manager
const authManager = new AuthManager();
// Call your database function
async function loadPandals() {
    const response = await fetch('/.netlify/functions/database?action=get-pandals');
    const pandals = await response.json();
    console.log(pandals);
}

// Save bookmark
async function bookmarkPandal(pandalId, userId) {
    const response = await fetch(`/.netlify/functions/database?action=save-bookmark&pandalId=${pandalId}&userId=${userId}`);
    const result = await response.json();
    return result;
}
// JavaScript Functions for Login/Logout Functionality

// Initialize user state on page load
document.addEventListener('DOMContentLoaded', function() {
    updateUserMenuState();
});

// Update menu based on user login state
function updateUserMenuState() {
    const isLoggedIn = checkUserLoginState();
    const loginMenuItem = document.getElementById('loginMenuItem');
    const userProfileItem = document.getElementById('userProfileItem');
    const logoutMenuItem = document.getElementById('logoutMenuItem');

    if (isLoggedIn) {
        // User is logged in - show profile and logout
        if (loginMenuItem) loginMenuItem.style.display = 'none';
        if (userProfileItem) userProfileItem.style.display = 'flex';
        if (logoutMenuItem) logoutMenuItem.style.display = 'flex';

        // Update user info
        updateUserProfileDisplay();

        // Remove premium locks
        removePremiumLocks();
    } else {
        // User is not logged in - show login button
        if (loginMenuItem) loginMenuItem.style.display = 'flex';
        if (userProfileItem) userProfileItem.style.display = 'none';
        if (logoutMenuItem) logoutMenuItem.style.display = 'none';

        // Add premium locks for guest users
        addPremiumLocks();
    }
}

// Check if user is logged in
function checkUserLoginState() {
    try {
        const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true' ||
            sessionStorage.getItem('isLoggedIn') === 'true';
        const userData = localStorage.getItem('userData') ||
            sessionStorage.getItem('userData');
        const sessionExpiry = localStorage.getItem('sessionExpiry') ||
            sessionStorage.getItem('sessionExpiry');

        // Check if session is still valid
        if (isLoggedIn && userData && sessionExpiry) {
            const expiryDate = new Date(sessionExpiry);
            const now = new Date();

            if (now < expiryDate) {
                return true;
            } else {
                // Session expired - clear data
                clearUserSession();
                return false;
            }
        }

        return false;
    } catch (error) {
        console.error('Error checking login state:', error);
        return false;
    }
}

// Update user profile display
function updateUserProfileDisplay() {
    try {
        const userData = JSON.parse(
            localStorage.getItem('userData') ||
            sessionStorage.getItem('userData') ||
            '{}'
        );

        const userName = document.getElementById('userName');
        const userEmail = document.getElementById('userEmail');
        const userProfilePic = document.getElementById('userProfilePic');
        const avatarFallback = document.getElementById('avatarFallback');

        if (userName) {
            userName.textContent = userData.name || userData.given_name || 'User';
        }

        if (userEmail) {
            userEmail.textContent = userData.email || '';
        }

        // Handle profile picture
        if (userData.picture && userProfilePic && avatarFallback) {
            userProfilePic.src = userData.picture;
            userProfilePic.style.display = 'block';
            avatarFallback.style.display = 'none';

            // Handle image load error
            userProfilePic.onerror = function() {
                this.style.display = 'none';
                avatarFallback.style.display = 'flex';
            };
        } else if (avatarFallback) {
            avatarFallback.style.display = 'flex';
            if (userProfilePic) userProfilePic.style.display = 'none';
        }

    } catch (error) {
        console.error('Error updating user profile display:', error);
    }
}

// Redirect to login page
function redirectToLogin() {
    // Close side menu first
    toggleSideMenu();

    // Add loading state
    showToast('Redirecting to sign in...', 'info');

    // Redirect to login page
    setTimeout(() => {
        window.location.href = 'login.html'; // NEW - direct to login page
    }, 500);
}

// Show user profile modal/details
function showUserProfile() {
    toggleSideMenu(); // Close side menu

    try {
        const userData = JSON.parse(
            localStorage.getItem('userData') ||
            sessionStorage.getItem('userData') ||
            '{}'
        );

        // You can implement a user profile modal here
        // For now, showing user info in an alert
        const userInfo = `
            Name: ${userData.name || 'N/A'}
            Email: ${userData.email || 'N/A'}
            Login Type: ${userData.email ? 'Google Account' : 'Guest'}
            Member Since: ${new Date(userData.loginTime || Date.now()).toLocaleDateString()}
        `;

        showToast('User Profile - Check console for details', 'info');
        console.log('User Profile:', userData);

    } catch (error) {
        console.error('Error showing user profile:', error);
        showToast('Error loading user profile', 'error');
    }
}

// Handle logout
function handleLogout() {
    // Show confirmation
    if (confirm('Are you sure you want to sign out?')) {
        clearUserSession();
        updateUserMenuState();
        toggleSideMenu(); // Close side menu
        showToast('You have been signed out successfully', 'success');

        // Optionally redirect to login page
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1500);
    }
}

// Clear user session
function clearUserSession() {
    try {
        // Clear from both localStorage and sessionStorage
        const keysToRemove = ['userData', 'isLoggedIn', 'authToken', 'sessionExpiry', 'termsAccepted'];

        keysToRemove.forEach(key => {
            localStorage.removeItem(key);
            sessionStorage.removeItem(key);
        });

        // Clear any other user-specific data
        localStorage.removeItem('bookmarkedPandals');
        localStorage.removeItem('visitedPandals');
        localStorage.removeItem('userPreferences');

    } catch (error) {
        console.error('Error clearing user session:', error);
    }
}

// Add premium locks for guest users
function addPremiumLocks() {
    const premiumMenuItems = [
        'showBookmarks',
        'showMyRoute',
        'showBadges'
    ];

    document.querySelectorAll('.menu-item').forEach(item => {
        const onclick = item.getAttribute('onclick');
        if (onclick && premiumMenuItems.some(func => onclick.includes(func))) {
            item.classList.add('premium-lock', 'guest-user');
            item.setAttribute('title', 'Sign in to access this feature');
        }
    });
}

// Remove premium locks for logged-in users
function removePremiumLocks() {
    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.remove('premium-lock', 'guest-user');
        item.removeAttribute('title');
    });
}

// Toast notification function (if not already defined)
function showToast(message, type = 'info') {
    // Remove existing toasts
    document.querySelectorAll('.toast').forEach(toast => toast.remove());

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    // Show toast
    requestAnimationFrame(() => {
        toast.classList.add('show');
    });

    // Auto hide after 4 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        toast.addEventListener('transitionend', () => {
            if (toast.parentNode) {
                toast.remove();
            }
        }, { once: true });
    }, 4000);
}

// Call updateUserMenuState when the side menu is opened
function toggleSideMenu() {
    const sideMenu = document.getElementById('sideMenu');
    const overlay = document.querySelector('.side-menu-overlay');

    if (sideMenu) {
        const isOpen = sideMenu.classList.contains('open');

        if (isOpen) {
            sideMenu.classList.remove('open');
            if (overlay) overlay.classList.remove('active');
        } else {
            sideMenu.classList.add('open');
            if (overlay) overlay.classList.add('active');
            // Update user state when opening menu
            updateUserMenuState();
        }
    }
}
