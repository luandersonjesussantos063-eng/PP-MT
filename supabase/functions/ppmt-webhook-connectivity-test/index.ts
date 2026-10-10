import {makeConnectivityTestHandler} from './logic.js';
Deno.serve(makeConnectivityTestHandler());
