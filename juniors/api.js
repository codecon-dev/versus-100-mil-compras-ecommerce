import express from "express";
import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

const dbConfig = {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
};

const pool = mysql.createPool(dbConfig);

app.get('/itens', async (req, res) => {
    try {
        const tipo = req.query.tipo;

        let query = 'SELECT * FROM itens';
        const params = [];

        if (tipo) {
            query += ' WHERE tipo = ?';
            params.push(tipo);
        }

        const [rows] = await pool.query(query, params);

        res.json(rows);

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao listar itens!' });
    }
});

app.post('/itens', async (req, res) => {
    try {
        const { nome, tipo, preco, descricao } = req.body;

        if (!nome || !tipo || preco == null) {
            return res.status(400).json({ error: 'nome, tipo e preco sao obrigatorios!' });
        }

        const [result] = await pool.query(
            'INSERT INTO itens (nome, tipo, preco, descricao) VALUES (?, ?, ?, ?)',
            [nome, tipo, preco, descricao || null]
        );

        res.status(201).json({
            id: result.insertId,
            nome, tipo, preco, descricao
        });

    } catch (error) {
        res.status(500).json({ error: 'Erro ao criar item!' });
    }
});

app.put('/itens/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const { nome, tipo, preco, descricao } = req.body;

        const [result] = await pool.query(
            'UPDATE itens SET nome = ?, tipo = ?, preco = ?, descricao = ? WHERE id = ?',
            [nome, tipo, preco, descricao || null, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Item nao encontrado!' });
        }

        res.json({ id: Number(id), nome, tipo, preco, descricao });

    } catch (error) {
        res.status(500).json({ error: 'Erro ao atualizar item' });
    }
});

app.delete('/itens/:id', async (req, res) => {

    try{
        const { id } = req.params;

        const [result] = await pool.query('DELETE FROM itens WHERE id = ?', [id]);

        if (result.affectedRows === 0){
            return res.status(404).json({error: 'Item nao encontrado!'})
        }

        res.json({message: 'Item removido com sucesso!'});
    }catch (error) {
        res.status(500).json({ error: 'ERRO ao deletar item'})
    }
});

app.listen(PORT, () => {
    console.log('Servidor rodando na porta 3000!');
})