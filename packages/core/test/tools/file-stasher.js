'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const should = require('should');
const nock = require('nock');

const { HTTPBIN_URL } = require('../constants');
const {
  FAKE_S3_URL,
  makeRpc,
  mockRpcGetPresignedPostCall,
  mockUpload,
} = require('./mocky');

const createFileStasher = require('../../src/tools/create-file-stasher');
const createAppRequestClient = require('../../src/tools/create-app-request-client');
const createInput = require('../../src/tools/create-input');

const sha1 = (stream) =>
  new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha1');
    stream
      .on('data', (d) => hash.update(d))
      .on('end', () => {
        const digest = hash.digest('hex');
        resolve(digest);
      })
      .on('error', reject);
  });

describe('file upload', () => {
  const testLogger = () => Promise.resolve({});
  const input = createInput({}, {}, testLogger);
  const request = createAppRequestClient(input);

  const rpc = makeRpc();
  const stashFile = createFileStasher({
    _zapier: {
      rpc,
      event: {
        method: 'hydrators.test',
      },
    },
  });

  it('should upload a blob of text', async () => {
    mockRpcGetPresignedPostCall('3333/hello.txt');
    mockUpload();

    const file = 'hello world this is a plain blob of text';
    const url = await stashFile(file);
    should(url).eql(`${FAKE_S3_URL}/3333/hello.txt`);

    const s3Response = await request({ url, raw: true });
    should(s3Response.getHeader('content-type')).startWith('text/plain');
    should(s3Response.getHeader('content-disposition')).eql(
      'attachment; filename="unnamedfile.txt"'
    );
    should(await s3Response.text()).eql(file);
  });

  it('should upload a buffer of text', async () => {
    mockRpcGetPresignedPostCall('5555/buffer.txt');
    mockUpload();

    const file = Buffer.from('hello world this is a buffer of text');
    const url = await stashFile(file);
    should(url).eql(`${FAKE_S3_URL}/5555/buffer.txt`);

    const s3Response = await request({ url, raw: true });
    should(s3Response.getHeader('content-type')).eql(
      'application/octet-stream'
    );
    should(s3Response.getHeader('content-disposition')).eql(
      'attachment; filename="unnamedfile"'
    );
    should(await s3Response.buffer()).eql(file);
  });

  it('should upload a file stream of text with no length', async () => {
    mockRpcGetPresignedPostCall('6666/new.txt');
    mockUpload();

    const filePath = path.join(__dirname, 'test.txt');
    const file = fs.createReadStream(filePath);

    const url = await stashFile(file);
    should(url).eql(`${FAKE_S3_URL}/6666/new.txt`);

    const s3Response = await request({ url, raw: true });
    should(s3Response.getHeader('content-type')).startWith('text/plain');
    should(s3Response.getHeader('content-disposition')).eql(
      'attachment; filename="test.txt"'
    );

    const expectedHash = await sha1(fs.createReadStream(filePath));
    should(await sha1(s3Response.body)).eql(expectedHash);
  });

  it('should upload a file stream of text with correct length', async () => {
    mockRpcGetPresignedPostCall('7777/new.txt');
    mockUpload();

    const filePath = path.join(__dirname, 'test.txt');
    const file = fs.createReadStream(filePath);
    const knownLength = fs.statSync(filePath).size;

    const url = await stashFile(file, knownLength);
    should(url).eql(`${FAKE_S3_URL}/7777/new.txt`);

    const s3Response = await request({ url, raw: true });
    should(s3Response.getHeader('content-type')).startWith('text/plain');
    should(s3Response.getHeader('content-disposition')).eql(
      'attachment; filename="test.txt"'
    );

    const expectedHash = await sha1(fs.createReadStream(filePath));
    should(await sha1(s3Response.body)).eql(expectedHash);
  });

  it('should fail a file stream of text with incorrect length', async () => {
    mockRpcGetPresignedPostCall('8888/new.txt');
    mockUpload();

    const filePath = path.join(__dirname, 'test.txt');
    const file = fs.createReadStream(filePath);
    const knownLength = fs.statSync(filePath).size;

    await stashFile(file, knownLength - 1).should.be.rejectedWith(
      /MalformedPOSTRequest/
    );
  });

  it('should throwForStatus if bad status', async () => {
    mockRpcGetPresignedPostCall('4444/deadbeef');
    mockUpload();

    nock('https://example.com').get('/stream-bytes').reply(401);

    const request = createAppRequestClient(input);
    const file = request({
      url: 'https://example.com/stream-bytes',
      raw: true,
    });
    await stashFile(file).should.be.rejectedWith(/"status":401/);
  });

  it('should upload a resolved buffer', async () => {
    mockRpcGetPresignedPostCall('3344/binary.dat');
    mockUpload();

    const buffer = Buffer.from('7468697320697320612074c3a97374', 'hex');
    const file = Promise.resolve().then(() => buffer);

    const url = await stashFile(file);
    should(url).eql(`${FAKE_S3_URL}/3344/binary.dat`);

    const s3Response = await request({ url, raw: true });
    should(s3Response.getHeader('content-type')).eql(
      'application/octet-stream'
    );
    should(s3Response.getHeader('content-disposition')).eql(
      'attachment; filename="unnamedfile"'
    );
    should(await s3Response.buffer()).eql(buffer);
  });

  it('should fail if being called from a trigger event', async () => {
    const stashFileTest = createFileStasher({
      _zapier: {
        rpc,
        event: {
          method: 'triggers.test.operation.perform',
        },
      },
    });

    const file = fs.createReadStream(path.join(__dirname, 'test.txt'));
    await stashFileTest(file).should.be.rejectedWith(
      /Files can only be stashed within a create or hydration function\/method/
    );
  });

  it('should fail if being called from a search event', async () => {
    const stashFileTest = createFileStasher({
      _zapier: {
        rpc,
        event: {
          method: 'search.test.operation.perform',
        },
      },
    });

    const file = fs.createReadStream(path.join(__dirname, 'test.txt'));
    await stashFileTest(file).should.be.rejectedWith(
      /Files can only be stashed within a create or hydration function\/method/
    );
  });

  it('should work if being called from a create/action event', async () => {
    mockRpcGetPresignedPostCall('1122/hello.txt');
    mockUpload();

    const stashFileTest = createFileStasher({
      _zapier: {
        rpc,
        event: {
          method: 'creates.test.operation.perform',
        },
      },
    });

    const file = 'hello world this is a plain blob of text';
    const url = await stashFileTest(file);
    should(url).eql(`${FAKE_S3_URL}/1122/hello.txt`);

    const s3Response = await request({ url, raw: true });
    should(s3Response.getHeader('content-type')).startWith('text/plain');
    should(s3Response.getHeader('content-disposition')).eql(
      'attachment; filename="unnamedfile.txt"'
    );

    // This is what you get when you:
    // echo -n 'hello world this is a plain blob of text' | sha1sum
    const expectedHash = '0bf8781f4606006f523f0dcf77e990f2fcf94bde';
    should(await sha1(s3Response.body)).eql(expectedHash);
  });

  it('should get filename from content-disposition', async () => {
    mockRpcGetPresignedPostCall('1234/foo.json');
    mockUpload();

    const file = request({
      url: `${HTTPBIN_URL}/response-headers`,
      params: {
        'Content-Disposition': 'inline; filename="an example.json"',
      },
      raw: true,
    });
    const url = await stashFile(file);
    should(url).eql(`${FAKE_S3_URL}/1234/foo.json`);

    const s3Response = await request({ url, raw: true });
    should(s3Response.getHeader('content-type')).startWith('application/json');
    should(s3Response.getHeader('content-disposition')).eql(
      'attachment; filename="an example.json"'
    );
  });

  it('should upload a png image', async () => {
    mockRpcGetPresignedPostCall('1234/pig.png');
    mockUpload();

    const file = request({
      url: `${HTTPBIN_URL}/image/png`,
      raw: true,
    });
    const url = await stashFile(file);
    should(url).eql(`${FAKE_S3_URL}/1234/pig.png`);

    const s3Response = await request({ url, raw: true });
    should(s3Response.getHeader('content-type')).eql('image/png');
    should(s3Response.getHeader('content-disposition')).eql(
      'attachment; filename="png.png"'
    );

    // This is what you get when you:
    // curl ${HTTPBIN_URL}/image/png | sha1sum
    const expectedHash = '379f5137831350c900e757b39e525b9db1426d53';
    should(await sha1(s3Response.body)).eql(expectedHash);
  });

  it('should upload gzip compressed content', async () => {
    // gzipped responses have a smaller content-length than the original
    // content. This test makes sure z.stashFile() doesn't use
    // the compressed content-length and create malformed form data.
    mockRpcGetPresignedPostCall('5678/gzip.json');
    mockUpload();

    const file = request({
      url: `${HTTPBIN_URL}/gzip`,
      raw: true,
    });
    const url = await stashFile(file);
    should(url).eql(`${FAKE_S3_URL}/5678/gzip.json`);

    const s3Response = await request({ url, raw: true });
    should(s3Response.getHeader('content-type')).startWith('application/json');
    should(s3Response.getHeader('content-disposition')).eql(
      'attachment; filename="gzip.json"'
    );

    const data = await s3Response.json();
    should(data.gzipped).be.true();
  });

  it('should upload resolved response', async () => {
    mockRpcGetPresignedPostCall('5678/document');
    mockUpload();

    // This request is resolved early because of the "await"
    const file = await request({
      url: `${HTTPBIN_URL}/xml`,
      raw: true,
    });
    const url = await stashFile(file);
    should(url).eql(`${FAKE_S3_URL}/5678/document`);

    const s3Response = await request({ url, raw: true });
    should(s3Response.getHeader('content-type')).startWith('application/xml');
    should(s3Response.getHeader('content-disposition')).eql(
      'attachment; filename="xml.xml"'
    );

    // This is what you get when you:
    // curl ${HTTPBIN_URL}/xml | sha1sum
    const expectedHash = '3aa959bec463787e6be8392a53bd1eb0806e0170';
    should(await sha1(s3Response.body)).eql(expectedHash);
  });

  it('should upload String object', async () => {
    mockRpcGetPresignedPostCall('5678/string');
    mockUpload();

    /* eslint no-new-wrappers: 0 */
    const file = new String('hello world');
    const url = await stashFile(file);
    should(url).eql(`${FAKE_S3_URL}/5678/string`);

    const s3Response = await request({ url, raw: true });
    should(s3Response.getHeader('content-type')).startWith('text/plain');
    should(s3Response.getHeader('content-disposition')).eql(
      'attachment; filename="unnamedfile.txt"'
    );
    should(await s3Response.text()).eql('hello world');
  });

  it('should fail for unknown type', async () => {
    mockRpcGetPresignedPostCall('5678/string');
    mockUpload();

    const file = [1, 2, 3];
    await stashFile(file).should.be.rejectedWith(/cannot stash type 'object'/);
  });

  it('should upload regular response', async () => {
    mockRpcGetPresignedPostCall('9999/document');
    mockUpload();

    const file = request(`${HTTPBIN_URL}/html`);
    const url = await stashFile(file);
    should(url).eql(`${FAKE_S3_URL}/9999/document`);

    const s3Response = await request({ url, raw: true });
    should(s3Response.getHeader('content-type')).startWith('text/html');
    should(s3Response.getHeader('content-disposition')).eql(
      'attachment; filename="html.html"'
    );

    // This is what you get when you:
    // curl ${HTTPBIN_URL}/html | sha1sum
    const expectedHash = '5dfecf638c8ab7e2e9d3bca1d3f213d708aedb25';
    should(await sha1(s3Response.body)).eql(expectedHash);
  });
});
