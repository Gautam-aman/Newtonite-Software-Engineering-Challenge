package com.newtonops.common;

public class ApiException extends RuntimeException {
  public final int status;
  public final String code;

  public ApiException(int status, String code, String message) {
    super(message);
    this.status = status;
    this.code = code;
  }

  public static ApiException forbidden() {
    return new ApiException(403, "FORBIDDEN", "You do not have permission for this action.");
  }

  public static ApiException conflict() {
    return new ApiException(
        409,
        "VERSION_CONFLICT",
        "This item changed. Refresh it and review the latest version before retrying.");
  }
}
