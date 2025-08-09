function basicAuth(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        res.setHeader('WWW-Authenticate', 'Basic realm="Acceso restringido"');
        return res.status(401).send('Autenticación requerida.');
    }

    const [username, password] = Buffer.from(authHeader.split(' ')[1], 'base64').toString().split(':');

    const validUser = process.env.APP_USER;
    const validPassword = process.env.APP_PASSWORD;

    if (username === validUser && password === validPassword) {
        return next();
    }

    res.setHeader('WWW-Authenticate', 'Basic realm="Acceso restringido"');
    return res.status(401).send('Credenciales incorrectas.');
}

module.exports = basicAuth;
