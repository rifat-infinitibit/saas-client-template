export const brandNames = {
	default: 'InfinitiBit',
	gt: 'Grant Thornton',
};

export type Brand = keyof typeof brandNames;

export const brands = Object.keys(brandNames) as Brand[];

// A typo in APP_BRAND leaves a working app in the wrong colours, which is not
// worth an outage.
export function toBrand(value: string | undefined): Brand {
	return brands.find((brand) => brand === value) ?? 'default';
}

export function brandAsset(
	brand: Brand,
	file: 'favicon.ico' | 'logo.svg' | 'mark.svg',
) {
	return `/brand/${brand}/${file}`;
}
