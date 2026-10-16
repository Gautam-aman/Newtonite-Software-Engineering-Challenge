package com.newtonops.auth;

import java.util.UUID;

public record Actor(UUID id, String email, String name) {}
