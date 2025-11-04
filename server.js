import Fastify from 'fastify';
import pkg from 'pg';
import cors from '@fastify/cors'

const { Pool } = pkg;

const pool = new Pool({
    user: 'local',
    host: 'localhost',
    database: 'receitas',
    password: '123',
    port: '5432'
})

const server = Fastify()

await server.register(cors, {
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE']
})


server.get('/usuarios', async (req, reply) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const allowedOrder = ['id', 'nome', 'email', 'telefone', 'ativo', 'data_criacao']
    const sort = allowedOrder.includes(req.query.sort) ? req.query.sort : 'id';
    const order = req.query.order === 'desc' ? "DESC" : "ASC"

    try {
        const resultado = await pool.query(`SELECT * FROM usuarios ORDER BY 
            ${sort} ${order} LIMIT ${limit} OFFSET ${offset}`)

        const count = await pool.query("SELECT COUNT(*) FROM USUARIOS")
        reply.status(200).send({data: resultado.rows, count: parseInt(count.rows[0].count) })
    } catch (err) {
        reply.status(500).send({ error: err.message })
    }
})

server.put('/usuarios/:id', async (req, reply) => {
    const id = req.params.id;
    const { nome, senha, email, telefone, ativo } = req.body
    try {
        const resultado = await pool.query(
            'UPDATE usuarios SET nome=$1, senha=$2, email=$3, telefone=$4, ativo=$5 WHERE id=$6 RETURNING *',
            [nome, senha, email, telefone, ativo, id]
        );

        if (resultado.rows.length === 0) {
             return reply.status(404).send({ error: 'Usuário não encontrado' });
        }
        
        reply.status(200).send(resultado.rows[0]);
    } catch (err) {
        reply.status(500).send({ error: err.message })
    }
})

server.delete('/usuarios/:id', async (req, reply) => {
    const id = req.params.id;
    try {
        await pool.query(
            'Delete from usuarios where id=$1',
            [id]
        )
        reply.send({mensagem: "Deu certo!"})
    } catch (err) {
        reply.status(500).send({ error: err.message })
    }
})

server.post('/usuarios', async (req, reply) => {
    const { nome, senha, email, telefone } = req.body;

    try {
        const resultado = await pool.query(
            'INSERT INTO USUARIOS (nome, senha, email, telefone) VALUES ($1, $2, $3, $4) RETURNING *',
            [nome, senha, email, telefone]
        )
        reply.status(200).send(resultado.rows[0])
    } catch (e) {
        reply.status(500).send({ error: e.message })
    }
})


server.get('/categorias', async (req, reply) => {
    try {
        const resultado = await pool.query('SELECT * FROM categorias')
        reply.status(200).send(resultado.rows)
    } catch (err) {
        reply.status(500).send({ error: err.message })
    }
})

server.post('/categorias', async (req, reply) => {
    const { nome } = req.body;

    try {
        const resultado = await pool.query(
            'INSERT INTO CATEGORIAS (nome) VALUES ($1) RETURNING *',
            [nome]
        )
        reply.status(200).send(resultado.rows[0])
    } catch (e) {
        reply.status(500).send({ error: e.message })
    }
})

server.put('/categorias/:id', async (req, reply) => {
    const { nome } = req.body;
    const id = req.params.id;
    try {
        const resultado = await pool.query(
            'UPDATE categorias set nome=$1 where id=$2 returning *',
            [nome, id]
        )
        reply.status(200).send(resultado.rows[0])
    } catch (e) {
        reply.status(500).send({ error: e.message })
    }
})

server.delete('/categorias/:id', async (req, reply) => {
    const id = req.params.id;
    try {
        await pool.query(
            'Delete from categorias where id=$1',
            [id]
        )
        reply.send({mensagem: "Deu certo!"})
    } catch (err) {
        reply.status(500).send({ error: err.message })
    }
})

server.get('/receitas', async (req, reply) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const allowedOrder = ['r.id', 'r.nome', 'usuario_nome', 'categoria_nome'];
    const sort = allowedOrder.includes(req.query.sort) ? req.query.sort : 'r.id';
    const order = req.query.order === 'desc' ? "DESC" : "ASC";

    try {
        const query = `
            SELECT 
                r.*, 
                u.nome AS usuario_nome, 
                c.nome AS categoria_nome 
            FROM 
                receitas r
            LEFT JOIN 
                usuarios u ON r.usuario_id = u.id
            LEFT JOIN 
                categorias c ON r.categoria_id = c.id
            ORDER BY 
                ${sort} ${order} 
            LIMIT ${limit} 
            OFFSET ${offset}
        `;
        
        const resultado = await pool.query(query);

        const countResult = await pool.query("SELECT COUNT(*) FROM receitas");

        reply.status(200).send({
            data: resultado.rows,
            count: parseInt(countResult.rows[0].count)
        });

    } catch (err) {
        reply.status(500).send({ error: err.message });
    }
})

server.get('/receitas/:id', async (req, reply) => {
    const id = req.params.id;
    try {
        const query = `
            SELECT 
                r.*, 
                u.nome AS usuario_nome, 
                c.nome AS categoria_nome 
            FROM 
                receitas r
            LEFT JOIN 
                usuarios u ON r.usuario_id = u.id
            LEFT JOIN 
                categorias c ON r.categoria_id = c.id
            WHERE 
                r.id = $1
        `;
        
        const resultado = await pool.query(query, [id]);

        if (resultado.rows.length === 0) {
            return reply.status(404).send({ error: 'Receita não encontrada' });
        }

        reply.status(200).send(resultado.rows[0]);
    } catch (err) {
        reply.status(500).send({ error: err.message });
    }
})

server.post('/receitas', async (req, reply) => {
    const { 
        nome, modo_preparo, ingredientes, usuario_id, 
        categoria_id, porcoes, tempo_preparo_minutos } = req.body;

    try {
        const resultado = await pool.query(
            'INSERT INTO RECEITAS (nome, modo_preparo, ingredientes, porcoes, tempo_preparo_minutos, usuario_id, categoria_id) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
            [nome, modo_preparo, ingredientes, porcoes, tempo_preparo_minutos, usuario_id, categoria_id ]
        )
        reply.status(200).send(resultado.rows[0])
    } catch (e) {
        reply.status(500).send({ error: e.message })
    }
})

server.put('/receitas/:id', async (req, reply) => {
    const id = req.params.id;
    const { 
        nome, modo_preparo, ingredientes, usuario_id, 
        categoria_id, porcoes, tempo_preparo_minutos 
    } = req.body;

    try {
        const resultado = await pool.query(
            `UPDATE receitas 
             SET nome=$1, modo_preparo=$2, ingredientes=$3, porcoes=$4, 
                 tempo_preparo_minutos=$5, usuario_id=$6, categoria_id=$7 
             WHERE id=$8 
             RETURNING *`,
            [nome, modo_preparo, ingredientes, porcoes, tempo_preparo_minutos, usuario_id, categoria_id, id]
        );

        if (resultado.rows.length === 0) {
            return reply.status(404).send({ error: 'Receita não encontrada' });
        }

        reply.status(200).send(resultado.rows[0]);
    } catch (e) {
        reply.status(500).send({ error: e.message });
    }
})

server.delete('/receitas/:id', async (req, reply) => {
    const id = req.params.id;
    try {
        const resultado = await pool.query(
            'DELETE FROM receitas WHERE id=$1 RETURNING *',
            [id]
        );

        if (resultado.rows.length === 0) {
            return reply.status(404).send({ error: 'Receita não encontrada' });
        }

        reply.status(200).send({ mensagem: "Receita deletada com sucesso!" });
    } catch (err) {
        reply.status(500).send({ error: err.message });
    }
})

server.listen({
    port: 3000,
    host: '0.0.0.0'
})