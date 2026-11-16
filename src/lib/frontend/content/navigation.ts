export const BRAND_NAME = 'Top Up Store';

export const HEADER_NAV_LINKS = [
	{ label: 'Home', href: '/', icon: 'home' },
	{ label: 'Cek Invoice', href: '/account/order-tracking', icon: 'receipt' },
	{ label: 'Daftar Harga', href: '/products', icon: 'tag' },
	{ label: 'Semua Game', href: '/categories', icon: 'gamepad' },
	{ label: 'Bantuan', href: '/help', icon: 'help' },
	{ label: 'Kontak', href: '/account/support-tickets', icon: 'headset' }
] as const;

export const FOOTER_LINKS = [
	{ label: 'Cek Invoice', href: '/account/order-tracking' },
	{ label: 'Daftar Harga', href: '/products' },
	{ label: 'Bantuan', href: '/help' },
	{ label: 'Kebijakan Privasi', href: '/privacy-policy' },
	{ label: 'Perlindungan Pembelian', href: '/help/purchase-protection' }
];

export const FOOTER_LEGAL = `© ${new Date().getFullYear()} ${BRAND_NAME}. Top up aman, gaming nyaman.`;
