import { createServer } from 'node:http';
import { stat } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { TransformStream } from 'node:stream/web';
import { setTimeout } from 'node:timers/promises';
import { Readable, Transform, Writable } from 'node:stream';

import byteSize from "byte-size";
import csvtojson from "csvtojson";

const PORT = 3000;
// curl -N localhost:3000
const server = createServer(async function (request, response) {
	const headers = {
		'Access-Control-Allow-Origin': '*',
		'Access-Control-Allow-Methods': '*'
	}
	if (request.method === 'OPTIONS') {
		response.writeHead(204, headers);
		response.end();
		return;
	}
	let counter = 0;
	const filename = './data/animeflv.csv';
	const { size } = await stat(filename);
	console.log(`processing ${byteSize(size)}`);
	try {
		const abortController = new AbortController();
		response.writeHead(200, headers);
		response.once('close', _ => {
			abortController.abort();
		});
		await Readable.toWeb(createReadStream(filename))
			.pipeThrough(
				Transform.toWeb(csvtojson())
			)
			.pipeThrough(
				new TransformStream({
					/**
					 * @param {Uint8Array} jsonLine
					 * @param {TransformStreamDefaultController} controller
					 */
					async transform(jsonLine, controller) {
						const buffer = Buffer.from(jsonLine);
						const { title, description, url_anime } = JSON.parse(buffer.toString());
						const mappingData = JSON.stringify({
							title, description, url: url_anime
						});
						counter++;
						await setTimeout(50);
						controller.enqueue(mappingData.concat('\n'));
					}
				})
			)
			.pipeTo(
				Writable.toWeb(response),
				{ signal: abortController.signal }
			);
	} catch (error) {
		if (error.message.includes('abort')) return;
		console.log('error', error);
	}

});

server
	.listen(PORT)
	.on('listening', _ => console.log(`server is running at ${PORT}`));
