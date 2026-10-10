import test from "node:test";
import assert from "node:assert/strict";
import { createReaderSession, sendRemoteScan } from "./remoteReaderApi.js";
const response=(body)=>({ok:true,status:200,json:async()=>body});
test("criacao do pareamento exige autenticacao do operador",async()=>{global.localStorage={getItem:()=>"jwt-operador"};let headers;global.fetch=async(_url,options)=>{headers=options.headers;return response({sessaoId:"1"});};await createReaderSession();assert.equal(headers.Authorization,"Bearer jwt-operador");delete global.localStorage;});
test("celular envia somente codigo e evento sem JWT",async()=>{global.localStorage={getItem:()=>"jwt-nao-deve-sair"};let call;global.fetch=async(url,options)=>{call=[url,options];return response({id:1});};await sendRemoteScan("pareamento","7894900011517","2d667c21-d005-4521-b011-8450f6c2dd87");assert.equal(call[1].headers.Authorization,undefined);assert.deepEqual(JSON.parse(call[1].body),{codigo:"7894900011517",eventoId:"2d667c21-d005-4521-b011-8450f6c2dd87"});delete global.localStorage;});
