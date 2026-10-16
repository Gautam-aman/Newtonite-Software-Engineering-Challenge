package com.newtonops.auth;
import com.newtonops.common.ApiException;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
@Service
public class AuthService {
    private final JdbcTemplate db;
    private final PasswordEncoder encoder;
    public AuthService(JdbcTemplate db, PasswordEncoder encoder) { this.db=db; this.encoder=encoder; }
    public static String hash(String value) {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8))); }
        catch (NoSuchAlgorithmException e) { throw new IllegalStateException(e); }
    }
    public Map<String,Object> login(String email, String password) {
        var users=db.queryForList("SELECT * FROM users WHERE email=?",email.toLowerCase(Locale.ROOT).trim());
        // A valid dummy BCrypt hash keeps absent-account checks on the password verification path.
        String stored=users.isEmpty()?"$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy":(String)users.getFirst().get("password_hash");
        if (!encoder.matches(password,stored) || users.isEmpty()) throw new ApiException(401,"INVALID_CREDENTIALS","Email or password is incorrect.");
        byte[] bytes=new byte[32]; new SecureRandom().nextBytes(bytes);
        String token=Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        db.update("INSERT INTO sessions(token_hash,user_id,expires_at) VALUES (?,?,now()+interval '8 hours')",hash(token),users.getFirst().get("id"));
        return Map.of("token",token,"user",new Actor((UUID)users.getFirst().get("id"),(String)users.getFirst().get("email"),(String)users.getFirst().get("name")));
    }
    public Optional<Actor> authenticate(String token) {
        return db.query("SELECT u.id,u.email,u.name FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>now()",(rs,n)->new Actor(rs.getObject(1,UUID.class),rs.getString(2),rs.getString(3)),hash(token)).stream().findFirst();
    }
    public void logout(String header) { if(header!=null && header.startsWith("Bearer ")) db.update("DELETE FROM sessions WHERE token_hash=?",hash(header.substring(7))); }
}
