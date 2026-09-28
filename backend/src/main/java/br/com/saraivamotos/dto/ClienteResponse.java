package br.com.saraivamotos.dto;

import java.time.LocalDateTime;
import br.com.saraivamotos.domain.Cliente;
import br.com.saraivamotos.domain.TipoCliente;

public record ClienteResponse(Long id, String nomeRazaoSocial, String telefone, String cpfCnpj,
        TipoCliente tipoCliente, String endereco, String observacoes, Boolean ativo, LocalDateTime dataCadastro) {
    public static ClienteResponse from(Cliente c) {
        return new ClienteResponse(c.getId(), c.getNomeRazaoSocial(), c.getTelefone(), c.getCpfCnpj(),
                c.getTipoCliente(), c.getEndereco(), c.getObservacoes(), c.getAtivo(), c.getDataCadastro());
    }
}
