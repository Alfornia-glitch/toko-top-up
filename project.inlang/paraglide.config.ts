export default {
	outdir: './src/lib/paraglide',
	// Cookie first, then the base locale ('id'). No URL prefixes and no Accept-Language sniffing,
	// so Indonesian stays the default for everyone until they use the language toggle.
	strategy: ['cookie', 'baseLocale'],
	emitTsDeclarations: true
};
