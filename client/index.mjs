const API_URL = 'http://localhost:3000';

function parseNDJSON() {
	return new TransformStream({
		transform(chunk, controller) {
			for (const item of chunk.split('\n')) {
				if (!item.length) continue;
				try {
					controller.enqueue(JSON.parse(item));
				} catch (error) {

				}
			}
		}
	})
}

let elementCounter = 0;
function appendToHtml(element) {
	return new WritableStream({
		write({ title, description, url }) {
			const card = `
				<article>
					<div class="text">
						<h3>${title}</h3>
						<p>${description.slice(0, 100)}</p>
						<a href="${url}" target="_blank">Here's why</a>
					</div>
				</article>
			`;
			element.innerHTML += card;
		},
		abort(reason) {
			console.log('aborted', reason);
		}
	})
}

async function consumeAPI(signal) {
	const response = await fetch(API_URL, { signal });
	return response.body
		.pipeThrough(
			new TextDecoderStream()
		)
		.pipeThrough(
			parseNDJSON()
		);
}

const [ start, stop, cards ] = [ 'start', 'stop' , 'cards' ].map(item => document.getElementById(item));

let abortController = new AbortController();

start.onclick = async function() {
	try {
		const reader = await consumeAPI(abortController.signal);
		await reader.pipeTo(appendToHtml(cards), { signal: abortController.signal });
	} catch (error) {
		if (!error.message.includes('abort')) throw error;
	}
}

stop.onclick = async function() {
	abortController.abort();
	abortController = new AbortController();
}
