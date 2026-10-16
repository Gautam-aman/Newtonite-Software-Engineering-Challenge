package com.newtonops.auth;
import java.io.IOException;
import java.util.List;
import jakarta.servlet.*;
import jakarta.servlet.http.*;
import org.springframework.context.annotation.*;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.*;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.filter.OncePerRequestFilter;
@Configuration
public class SecurityConfig {
    @Bean PasswordEncoder passwords() { return new BCryptPasswordEncoder(12); }
    @Bean SecurityFilterChain security(HttpSecurity http,AuthService auth) throws Exception {
        // Bearer credentials are never sent automatically by a browser; no cookie authentication.
        return http.csrf(c->c.disable()).sessionManagement(s->s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(r->r.requestMatchers("/api/auth/login","/actuator/health").permitAll().anyRequest().authenticated())
            .exceptionHandling(e->e.authenticationEntryPoint((req,res,ex)->error(res,401,"UNAUTHENTICATED","Please sign in to continue."))
                .accessDeniedHandler((req,res,ex)->error(res,403,"FORBIDDEN","Access denied.")))
            .addFilterBefore(new OncePerRequestFilter() {
                protected void doFilterInternal(HttpServletRequest req,HttpServletResponse res,FilterChain chain) throws ServletException,IOException {
                    String header=req.getHeader("Authorization");
                    try {
                        if(header!=null && header.startsWith("Bearer ")) auth.authenticate(header.substring(7)).ifPresent(a->SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(a,null,List.of())));
                    } catch(org.springframework.dao.DataAccessException ex) { error(res,503,"UNAVAILABLE","The service is temporarily unavailable."); return; }
                    chain.doFilter(req,res);
                }
            },UsernamePasswordAuthenticationFilter.class).build();
    }
    static void error(HttpServletResponse res,int status,String code,String message) throws IOException {
        res.setStatus(status);res.setContentType(MediaType.APPLICATION_JSON_VALUE);
        res.getWriter().write("{\"code\":\""+code+"\",\"message\":\""+message+"\",\"fields\":{}}");
    }
}
