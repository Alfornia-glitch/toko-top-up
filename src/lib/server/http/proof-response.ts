/** Proof images are sensitive: private, uncached, and never sniffed into another type. */
export function proofImageResponse(proof: { bytes: Uint8Array; mime: string }): Response {
	return new Response(proof.bytes as BodyInit, {
		headers: {
			'content-type': proof.mime,
			'content-length': String(proof.bytes.length),
			'cache-control': 'private, no-store',
			'x-content-type-options': 'nosniff',
			'content-disposition': 'inline',
			'content-security-policy': "default-src 'none'; sandbox"
		}
	});
}
