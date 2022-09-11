'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var tslib = require('tslib');
var ethSigUtil = require('eth-sig-util');
var ethers = require('ethers');
var rest = require('@octokit/rest');

/**
 * Helper functions that when passed a request will return a
 * boolean indicating if the request uses that HTTP method,
 * header, host or referrer.
 */
var Method = function (method) { return function (req) {
    return req.method.toLowerCase() === method.toLowerCase();
}; };
var Connect = Method('connect');
var Delete = Method('delete');
var Get = Method('get');
var Head = Method('head');
var Options = Method('options');
var Patch = Method('patch');
var Post = Method('post');
var Put = Method('put');
var Trace = Method('trace');
var Path = function (regExp) { return function (req) {
    var url = new URL(req.url);
    var path = url.pathname;
    var match = path.match(regExp) || [];
    return match[0] === path;
}; };
/**
 * The Router handles determines which handler is matched given the
 * conditions present for each request.
 */
var Router = /** @class */ (function () {
    function Router() {
        // @ts-ignore
        this.routes = [];
    }
    Router.prototype.handle = function (conditions, handler) {
        // @ts-ignore
        this.routes.push({
            conditions: conditions,
            handler: handler
        });
        return this;
    };
    Router.prototype.connect = function (url, handler) {
        return this.handle([Connect, Path(url)], handler);
    };
    Router.prototype["delete"] = function (url, handler) {
        return this.handle([Delete, Path(url)], handler);
    };
    Router.prototype.get = function (url, handler) {
        return this.handle([Get, Path(url)], handler);
    };
    Router.prototype.head = function (url, handler) {
        return this.handle([Head, Path(url)], handler);
    };
    Router.prototype.options = function (url, handler) {
        return this.handle([Options, Path(url)], handler);
    };
    Router.prototype.patch = function (url, handler) {
        return this.handle([Patch, Path(url)], handler);
    };
    Router.prototype.post = function (url, handler) {
        return this.handle([Post, Path(url)], handler);
    };
    Router.prototype.put = function (url, handler) {
        return this.handle([Put, Path(url)], handler);
    };
    Router.prototype.trace = function (url, handler) {
        return this.handle([Trace, Path(url)], handler);
    };
    Router.prototype.all = function (handler) {
        return this.handle([], handler);
    };
    Router.prototype.route = function (req) {
        var route = this.resolve(req);
        if (route) {
            return route.handler(req);
        }
        return new Response('resource not found', {
            status: 404,
            statusText: 'not found',
            headers: {
                'content-type': 'text/plain'
            }
        });
    };
    /**
     * resolve returns the matching route for a request that returns
     * true for all conditions (if any).
     */
    Router.prototype.resolve = function (req) {
        // @ts-ignore
        return this.routes.find(function (r) {
            // @ts-ignore
            if (!r.conditions || (Array.isArray(r) && !r.conditions.length)) {
                return true;
            }
            if (typeof r.conditions === 'function') {
                return r.conditions(req);
            }
            return r.conditions.every(function (c) { return c(req); });
        });
    };
    return Router;
}());

/**
 * gatherResponse awaits and returns a response body as a string.
 * Use await gatherResponse(..) in an async function to get the response body
 * @param {Response} response
 */
function gatherResponse(response) {
    return tslib.__awaiter(this, void 0, void 0, function () {
        var headers, contentType;
        return tslib.__generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    headers = response.headers;
                    contentType = headers.get('content-type') || '';
                    if (!contentType.includes('application/json')) return [3 /*break*/, 1];
                    return [2 /*return*/, response.json()];
                case 1:
                    if (!contentType.includes('application/text')) return [3 /*break*/, 3];
                    return [4 /*yield*/, response.text()];
                case 2: return [2 /*return*/, _a.sent()];
                case 3:
                    if (!contentType.includes('text/html')) return [3 /*break*/, 5];
                    return [4 /*yield*/, response.text()];
                case 4: return [2 /*return*/, _a.sent()];
                case 5: return [4 /*yield*/, response.text()];
                case 6: return [2 /*return*/, _a.sent()];
            }
        });
    });
}

// github api info
var USER_AGENT = 'Cloudflare Worker';
// format request for twitter api
var requestHeaders = new Headers();
// @ts-ignore
requestHeaders.append('Authorization', 'Bearer ' + TWITTER_BEARER);
var requestOptions = {
    method: 'GET',
    headers: requestHeaders,
    redirect: 'follow'
};
var init = {
    headers: { 'content-type': 'application/json' }
};
// regex for parsing tweet
var reg = new RegExp('(?<=sig:).*');
/**
 * @param {*} request
 * Accpets id=<tweet id>
 * Accepts account=<eth address> // just used to aler client of incorrect signer found
 *
 * 1. fetch tweet data using tweet id
 * 2. construct signature data using handle from tweet
 * 3. recover signer of signature from tweet
 * 4. if signer is the expected address, update gist with address -> handle mapping
 */
function handleVerify(request) {
    return tslib.__awaiter(this, void 0, void 0, function () {
        var searchParams, tweetID, account, twitterURL, twitterRes, twitterResponse, tweetContent, handle, matchedText, data, sig, signer, formattedSigner, response, fileName, githubPath, fileInfo, fileJSON, sha, decodedSybilList, stringData, encodedData, octokit, updateResponse, e_1;
        return tslib.__generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 6, , 7]);
                    searchParams = new URL(request.url).searchParams;
                    tweetID = searchParams.get('id');
                    account = searchParams.get('account');
                    twitterURL = "https://api.twitter.com/2/tweets?ids=".concat(tweetID, "&expansions=author_id&user.fields=username");
                    requestOptions.headers.set('Origin', new URL(twitterURL).origin); // format for cors
                    return [4 /*yield*/, fetch(twitterURL, requestOptions)
                        // parse the response from Twitter
                    ];
                case 1:
                    twitterRes = _a.sent();
                    return [4 /*yield*/, gatherResponse(twitterRes)
                        // if no tweet or author found, return error
                    ];
                case 2:
                    twitterResponse = _a.sent();
                    // if no tweet or author found, return error
                    if (!twitterResponse.data || !twitterResponse.includes) {
                        return [2 /*return*/, new Response(null, {
                                status: 400,
                                statusText: 'Invalid tweet id'
                            })];
                    }
                    tweetContent = twitterResponse.data[0].text;
                    handle = twitterResponse.includes.users[0].username;
                    matchedText = tweetContent.match(reg);
                    // if no proper signature or handle data found, return error
                    if (!twitterResponse.data ||
                        !twitterResponse.includes ||
                        !matchedText) {
                        return [2 /*return*/, new Response(null, {
                                status: 400,
                                statusText: 'Invalid tweet format'
                            })];
                    }
                    data = {
                        types: {
                            EIP712Domain: [
                                { name: 'name', type: 'string' },
                                { name: 'version', type: 'string' },
                            ],
                            Permit: [{ name: 'username', type: 'string' }]
                        },
                        domain: {
                            name: 'Sybil Verifier',
                            version: '1'
                        },
                        primaryType: 'Permit',
                        message: {
                            username: handle
                        }
                    };
                    sig = matchedText[0].slice(0, 132);
                    signer = ethSigUtil.recoverPersonalSignature({
                        data: JSON.stringify(data),
                        sig: sig
                    });
                    formattedSigner = ethers.ethers.utils.getAddress(signer);
                    // if signer found is not the expected signer, alert client and dont update gist
                    if (account !== formattedSigner) {
                        // @ts-ignore
                        return [2 /*return*/, new Response(null, init, {
                                status: 400,
                                statusText: 'Invalid account'
                            })];
                    }
                    response = void 0;
                    fileName = 'verified.json';
                    githubPath = '/repos/Uniswap/sybil-list/contents/';
                    return [4 /*yield*/, fetch('https://api.github.com' + githubPath + fileName, {
                            headers: {
                                // @ts-ignore
                                Authorization: 'token ' + GITHUB_AUTHENTICATION,
                                'User-Agent': USER_AGENT
                            }
                        })];
                case 3:
                    fileInfo = _a.sent();
                    return [4 /*yield*/, fileInfo.json()];
                case 4:
                    fileJSON = _a.sent();
                    sha = fileJSON.sha;
                    decodedSybilList = JSON.parse(atob(fileJSON.content));
                    decodedSybilList[formattedSigner] = {
                        twitter: {
                            timestamp: Date.now(),
                            tweetID: tweetID,
                            handle: handle
                        }
                    };
                    stringData = JSON.stringify(decodedSybilList);
                    encodedData = btoa(stringData);
                    octokit = new rest.Octokit({
                        // @ts-ignore
                        auth: GITHUB_AUTHENTICATION
                    });
                    return [4 /*yield*/, octokit.request('PUT ' + githubPath + fileName, {
                            owner: 'uniswap',
                            repo: 'sybil-list',
                            path: fileName,
                            message: 'Linking ' + formattedSigner + ' to handle: ' + handle,
                            sha: sha,
                            content: encodedData
                        })];
                case 5:
                    updateResponse = _a.sent();
                    if (updateResponse.status === 200) {
                        // respond with handle if succesul update
                        // @ts-ignore
                        response = new Response(handle, init, {
                            status: 200,
                            statusText: 'Succesful verification'
                        });
                    }
                    else {
                        // @ts-ignore
                        response = new Response(null, init, {
                            status: 400,
                            statusText: 'Error updating list.'
                        });
                    }
                    response.headers.set('Access-Control-Allow-Origin', '*');
                    response.headers.append('Vary', 'Origin');
                    return [2 /*return*/, response];
                case 6:
                    e_1 = _a.sent();
                    // @ts-ignore
                    response = new Response(null, init, {
                        status: 400,
                        statusText: 'Error:' + e_1
                    });
                    return [3 /*break*/, 7];
                case 7: return [2 /*return*/];
            }
        });
    });
}

var corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,HEAD,POST,OPTIONS',
    'Access-Control-Max-Age': '86400'
};
function handleOptions(request) {
    var headers = request.headers;
    if (headers.get('Origin') !== null &&
        headers.get('Access-Control-Request-Method') !== null &&
        headers.get('Access-Control-Request-Headers') !== null) {
        var respHeaders = tslib.__assign(tslib.__assign({}, corsHeaders), { 'Access-Control-Allow-Headers': request.headers.get('Access-Control-Request-Headers') });
        return new Response(null, {
            headers: respHeaders
        });
    }
    else {
        return new Response(null, {
            headers: {
                Allow: 'GET, HEAD, POST, OPTIONS'
            }
        });
    }
}
function handleRequest(request) {
    return tslib.__awaiter(this, void 0, void 0, function () {
        var r, resp;
        return tslib.__generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    r = new Router();
                    r.get('.*/verify', function (request) { return handleVerify(request); });
                    r.get('/', function () {
                        return new Response(null, {
                            status: 404,
                            statusText: 'No route specified'
                        });
                    });
                    return [4 /*yield*/, r.route(request)];
                case 1:
                    resp = _a.sent();
                    return [2 /*return*/, resp];
            }
        });
    });
}
var PROXY_ENDPOINT = '/api';
addEventListener('fetch', function (event) {
    // @ts-ignore
    var request = event.request;
    var url = new URL(request.url);
    if (url.pathname.startsWith(PROXY_ENDPOINT)) {
        if (request.method === 'OPTIONS') {
            // Handle CORS preflight requests
            // @ts-ignore
            event.respondWith(handleOptions(request));
        }
        else if (request.method === 'GET' ||
            request.method === 'HEAD' ||
            request.method === 'POST') {
            // Handle requests to the API server
            // @ts-ignore
            event.respondWith(handleRequest(request));
        }
        else {
            // @ts-ignore
            event.respondWith(new Response(null, {
                status: 405,
                statusText: 'Method Not Allowed'
            }));
        }
    }
    else {
        // @ts-ignore
        event.respondWith(new Response(null, {
            status: 404,
            statusText: 'Invalid route'
        }));
    }
});

exports.gatherResponse = gatherResponse;
exports.handleVerify = handleVerify;
exports.router = Router;
//# sourceMappingURL=index.js.map
