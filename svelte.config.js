import adapter from '@sveltejs/adapter-node';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		// adapter-node for Docker/Fly.io deployment
		adapter: adapter()
	}
};

export default config;
