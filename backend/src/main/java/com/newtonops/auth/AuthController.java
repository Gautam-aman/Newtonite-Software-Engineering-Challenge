package com.newtonops.auth;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.Map;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
  private final AuthService auth;

  public AuthController(AuthService auth) {
    this.auth = auth;
  }

  public record Login(
      @NotBlank @Email @Size(max = 254) String email, @NotBlank @Size(max = 128) String password) {}

  @PostMapping("/login")
  Map<String, Object> login(@Valid @RequestBody Login body) {
    return auth.login(body.email(), body.password());
  }

  @GetMapping("/me")
  Actor me(@AuthenticationPrincipal Actor actor) {
    return actor;
  }

  @PostMapping("/logout")
  void logout(@RequestHeader(value = "Authorization", required = false) String header) {
    auth.logout(header);
  }
}
