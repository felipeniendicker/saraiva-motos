import test from "node:test";
import assert from "node:assert/strict";
import { convertQuote, createQuote } from "./quotesApi.js";
const response=(body,status=200)=>({ok:status<400,status,json:async()=>body});
test("salva orçamento sem criar venda",async()=>{let url;global.fetch=async(value)=>{url=value;return response({id:1});};await createQuote({itens:[{tipoItem:"SERVICO"}]});assert.match(url,/\/api\/orcamentos$/);});
test("conversão envia chave idempotente",async()=>{let options;global.fetch=async(_url,value)=>{options=value;return response({id:9});};await convertQuote(1,{formaPagamento:"PIX"},"22678568-96ff-49c2-a812-3b160e19ad99");assert.equal(options.headers["Idempotency-Key"],"22678568-96ff-49c2-a812-3b160e19ad99");});
