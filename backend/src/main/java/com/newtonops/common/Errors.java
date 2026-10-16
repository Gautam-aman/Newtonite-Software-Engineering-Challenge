package com.newtonops.common;
import java.util.Map;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.dao.DataAccessException;
@RestControllerAdvice
public class Errors {
    public record Error(String code, String message, Map<String,String> fields) {}
    @ExceptionHandler(ApiException.class)
    ResponseEntity<Error> domain(ApiException e) { return ResponseEntity.status(e.status).body(new Error(e.code,e.getMessage(),Map.of())); }
    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<Error> validation(MethodArgumentNotValidException e) {
        var fields = new java.util.LinkedHashMap<String,String>();
        e.getBindingResult().getFieldErrors().forEach(f -> fields.put(f.getField(),f.getDefaultMessage()));
        return ResponseEntity.badRequest().body(new Error("VALIDATION","Please check the highlighted fields.",fields));
    }
    @ExceptionHandler({HttpMessageNotReadableException.class, MethodArgumentTypeMismatchException.class, IllegalArgumentException.class, org.springframework.web.bind.MissingRequestHeaderException.class})
    ResponseEntity<Error> malformed(Exception e) { return ResponseEntity.badRequest().body(new Error("BAD_REQUEST","Invalid or missing request values.",Map.of())); }
    @ExceptionHandler(DataAccessException.class)
    ResponseEntity<Error> database(DataAccessException e) {
        LoggerFactory.getLogger(Errors.class).error("Database operation failed",e);
        return ResponseEntity.status(503).body(new Error("UNAVAILABLE","The service is temporarily unavailable. Please retry shortly.",Map.of()));
    }
    @ExceptionHandler(Exception.class)
    ResponseEntity<Error> unexpected(Exception e) {
        LoggerFactory.getLogger(Errors.class).error("Unhandled request failure",e);
        return ResponseEntity.internalServerError().body(new Error("INTERNAL","Something went wrong. Please try again.",Map.of()));
    }
}
