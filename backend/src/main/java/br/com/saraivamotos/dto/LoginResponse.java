package br.com.saraivamotos.dto;

public record LoginResponse(String token, UsuarioResponse usuario) {
}
