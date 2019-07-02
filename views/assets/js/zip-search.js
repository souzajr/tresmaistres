function limpa_formulário_cep() {
    document.getElementById('checkuot-form-street').value = ("")
    document.getElementById('checkuot-form-neighborhood').value = ("")
    document.getElementById('checkuot-form-city').value = ("")
    document.getElementById('checkuot-form-state').value = ("Selecione")
}

function meu_callback(conteudo) {
    if (!("erro" in conteudo)) {
        document.getElementById('checkuot-form-street').value = (conteudo.logradouro)
        document.getElementById('checkuot-form-neighborhood').value = (conteudo.bairro)
        document.getElementById('checkuot-form-city').value = (conteudo.localidade)
        document.getElementById('checkuot-form-state').value = (conteudo.uf)
    } else {
        limpa_formulário_cep()
        alert("CEP não encontrado, digite manualmente o endereço")
    }
}

function pesquisacep(valor) {
    let cep = valor.replace(/\D/g, '')
    if (cep != "") {
        let validacep = /^[0-9]{8}$/

        if (validacep.test(cep)) {
            document.getElementById('checkuot-form-street').value = "..."
            document.getElementById('checkuot-form-neighborhood').value = "..."
            document.getElementById('checkuot-form-city').value = "..."
            document.getElementById('checkuot-form-state').value = "..."
            let script = document.createElement('script')
            script.src = 'https://viacep.com.br/ws/' + cep + '/json/?callback=meu_callback'
            document.body.appendChild(script)
        } else {
            limpa_formulário_cep()
            alert("Formato de CEP inválido")
        }
    } else {
        limpa_formulário_cep()
    }
}
/////////////////////////

function patient_limpa_formulário_cep() {
    document.getElementById('patient-form-street').value = ("")
    document.getElementById('patient-form-neighborhood').value = ("")
    document.getElementById('patient-form-city').value = ("")
    document.getElementById('patient-form-state').value = ("Selecione")
}

function patient_meu_callback(conteudo) {
    if (!("erro" in conteudo)) {
        document.getElementById('patient-form-street').value = (conteudo.logradouro)
        document.getElementById('patient-form-neighborhood').value = (conteudo.bairro)
        document.getElementById('patient-form-city').value = (conteudo.localidade)
        document.getElementById('patient-form-state').value = (conteudo.uf)
    } else {
        patient_limpa_formulário_cep()
        alert("CEP não encontrado, digite manualmente o endereço")
    }
}

function pesquisaceppatient(valor) {
    let cep = valor.replace(/\D/g, '')
    if (cep != "") {
        let validacep = /^[0-9]{8}$/

        if (validacep.test(cep)) {
            document.getElementById('patient-form-street').value = "..."
            document.getElementById('patient-form-neighborhood').value = "..."
            document.getElementById('patient-form-city').value = "..."
            document.getElementById('patient-form-state').value = "..."
            let script = document.createElement('script')
            script.src = 'https://viacep.com.br/ws/' + cep + '/json/?callback=patient_meu_callback'
            document.body.appendChild(script)
        } else {
            patient_limpa_formulário_cep()
            alert("Formato de CEP inválido")
        }
    } else {
        patient_limpa_formulário_cep()
    }
}

//////////////////////// 3

function clinic_limpa_formulário_cep() {
    document.getElementById('clinic-form-street').value = ("")
    document.getElementById('clinic-form-neighborhood').value = ("")
    document.getElementById('clinic-form-state').value = ("Selecione")
    document.getElementById('clinic-form-city').value = ("Selecione")
}

function clinic_meu_callback(conteudo) {
    if (!("erro" in conteudo)) {
        document.getElementById('clinic-form-street').value = (conteudo.logradouro)
        document.getElementById('clinic-form-neighborhood').value = (conteudo.bairro)
        document.getElementById('clinic-form-state').value = (conteudo.uf)
        document.getElementById('clinic-form-city').value = (conteudo.localidade)
    } else {
        clinic_limpa_formulário_cep()
        alert("CEP não encontrado, digite manualmente o endereço")
    }
}

function pesquisacepclinic(valor) {
    let cep = valor.replace(/\D/g, '')
    if (cep != "") {
        let validacep = /^[0-9]{8}$/

        if (validacep.test(cep)) {
            document.getElementById('clinic-form-street').value = "..."
            document.getElementById('clinic-form-neighborhood').value = "..."
            document.getElementById('clinic-form-city').value = "..."
            document.getElementById('clinic-form-state').value = "..."
            let script = document.createElement('script')
            script.src = 'https://viacep.com.br/ws/' + cep + '/json/?callback=clinic_meu_callback'
            document.body.appendChild(script)
        } else {
            clinic_limpa_formulário_cep()
            alert("Formato de CEP inválido")
        }
    } else {
        clinic_limpa_formulário_cep()
    }
}