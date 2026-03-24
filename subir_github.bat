@echo off
echo --- INICIANDO CONFIGURACAO DO GIT ---

echo 1. Inicializando repositorio...
call git init

echo 2. Adicionando todos os arquivos...
call git add .

echo 3. Criando commit inicial...
call git commit -m "feat: enterprise onboarding demo version"

echo 4. Renomeando branch para main...
call git branch -M main

echo 5. Configurando repositorio remoto...
call git remote remove origin 2>nul
call git remote add origin https://github.com/augustope99/pagina-de-credenciamento.git

echo 6. Enviando arquivos para o GitHub...
call git push -u origin main

echo --- SUCESSO! SEU PORTFOLIO ESTA NO AR ---
pause