import test from "node:test";
import assert from "node:assert/strict";
import { closeCash, getCurrentCash, moveCash, openCash } from "./cashApi.js";
const response=(body,status=200)=>({ok:status<400,status,json:async()=>body});
test("abre e consulta caixa pela API",async()=>{const calls=[];global.fetch=async(url,options)=>{calls.push([url,options]);return response({id:1});};await openCash(100);await getCurrentCash();assert.equal(calls[0][0],"http://localhost:8080/api/caixas");assert.deepEqual(JSON.parse(calls[0][1].body),{valorInicial:100});assert.equal(calls[1][0],"http://localhost:8080/api/caixas/atual");});
test("movimento avulso envia chave idempotente",async()=>{let options;global.fetch=async(_url,value)=>{options=value;return response({id:2});};await moveCash(1,{tipo:"SAIDA_AVULSA",valor:20,descricao:"Frete"},"fe71467c-a51d-449a-a184-09fe06166709");assert.equal(options.headers["Idempotency-Key"],"fe71467c-a51d-449a-a184-09fe06166709");});
test("fechamento envia somente valor contado",async()=>{let body;global.fetch=async(_url,options)=>{body=JSON.parse(options.body);return response({status:"FECHADO"});};await closeCash(1,95.5);assert.deepEqual(body,{valorContado:95.5});});
