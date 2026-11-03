import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';

export const application = JSON.parse(await readFile(new URL('../fixtures/application.json', import.meta.url), 'utf8'));
export const enrolmentFields = application.dataFields.map((field) => field.name);
const frontend = new Map(await Promise.all([
  ['/', 'index.html', 'text/html; charset=utf-8'],
  ['/app.js', 'app.js', 'text/javascript; charset=utf-8']
].map(async ([route, file, contentType]) => [route, {
  contentType, body: await readFile(new URL(`../public/${file}`, import.meta.url), 'utf8')
}])));

export function createApplication() {
  const enrolments = structuredClone(application.enrolments);
  return createServer(async (request, response) => {
    const reply = (status, body) => {
      response.writeHead(status, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff'
      });
      response.end(JSON.stringify(body));
    };
    const pathname = new URL(request.url, 'http://localhost').pathname;
    if (request.method === 'GET' && frontend.has(pathname)) {
      const { contentType, body } = frontend.get(pathname);
      response.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff'
      });
      return response.end(body);
    }
    if (request.method === 'GET' && pathname === '/health') {
      return reply(200, { status: 'ok', applicationId: application.applicationId, synthetic: true });
    }
    if (request.method === 'GET' && pathname === '/api/application') {
      const { enrolments: seedRecords, ...metadata } = application;
      return reply(200, metadata);
    }
    if (request.method === 'GET' && pathname === '/api/enrolments') {
      return reply(200, enrolments);
    }
    if (request.method === 'POST' && pathname === '/api/enrolments') {
      if (request.headers['content-type']?.split(';')[0].trim() !== 'application/json') {
        return reply(415, { error: 'Use application/json.' });
      }
      try {
        const chunks = [];
        let length = 0;
        for await (const chunk of request) {
          length += chunk.length;
          if (length > 16384) return reply(413, { error: 'Request exceeds 16 KiB.' });
          chunks.push(chunk);
        }
        const input = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        if (!input || typeof input !== 'object' || Array.isArray(input)) {
          return reply(400, { error: 'Expected a JSON object.' });
        }
        const errors = enrolmentFields.filter((field) => typeof input[field] !== 'string' || !input[field].trim() || input[field].length > 160)
          .map((field) => `${field} must contain 1 to 160 characters.`);
        if (Object.hasOwn(input, 'homeAddress') && (typeof input.homeAddress !== 'string' || !input.homeAddress.trim() || input.homeAddress.length > 160)) {
          errors.push('homeAddress must contain 1 to 160 characters when supplied.');
        }
        if (typeof input.workEmail === 'string' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.workEmail)) errors.push('workEmail must be an email address.');
        if (!['enrolled', 'completed'].includes(input.completionStatus)) errors.push('completionStatus must be enrolled or completed.');
        const unknownFields = Object.keys(input).filter((field) => !enrolmentFields.includes(field) && field !== 'homeAddress');
        if (unknownFields.length) errors.push(`Unexpected fields: ${unknownFields.join(', ')}.`);
        if (errors.length) return reply(400, { errors });
        const record = { id: randomUUID(), ...Object.fromEntries(enrolmentFields.map((field) => [field, input[field].trim()])) };
        if (Object.hasOwn(input, 'homeAddress')) record.homeAddress = input.homeAddress.trim();
        enrolments.push(record);
        return reply(201, record);
      } catch (error) {
        if (error instanceof SyntaxError) return reply(400, { error: 'Malformed JSON.' });
        return reply(500, { error: 'Unable to process request.' });
      }
    }
    return reply(404, { error: 'Not found.' });
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.PORT ?? 3100);
  const server = createApplication();
  server.listen(port, '127.0.0.1', () => console.log(`Training Register Demo API: http://127.0.0.1:${server.address().port}/api/application`));
}