package auth

import (
	"context"
	"errors"
	"fmt"
	"net/url"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/lestrrat-go/jwx/v2/jwk"
)

// CustomClaims includes the standard JWT claims plus any custom claims.
type CustomClaims struct {
	Scope string `json:"scope"`
	jwt.RegisteredClaims
}

// Validator holds the configuration needed to validate a JWT.
type Validator struct {
	keyFunc    jwt.Keyfunc
	issuer     string
	audience   []string
}

// NewValidator creates a new JWT validator. It now accepts optional jwk.RegisterOption
// parameters, which makes it possible to inject a custom http.Client for testing.
func NewValidator(ctx context.Context, domain, audience string, regOpts ...jwk.RegisterOption) (*Validator, error) {
	issuerURL, err := url.Parse("https://" + domain + "/")
	if err != nil {
		return nil, fmt.Errorf("failed to parse issuer URL: %w", err)
	}

	jwksURL := issuerURL.JoinPath(".well-known/jwks.json").String()

	cache := jwk.NewCache(ctx)

	// Combine default options with any provided options for testability.
	opts := []jwk.RegisterOption{jwk.WithRefreshInterval(1 * time.Hour)}
	opts = append(opts, regOpts...)

	// Register the JWKS URL with the combined options.
	err = cache.Register(jwksURL, opts...)
	if err != nil {
		return nil, fmt.Errorf("failed to register JWKS URL in cache: %w", err)
	}

	// Fetch the keys for the first time to ensure connectivity.
	_, err = cache.Refresh(ctx, jwksURL)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch initial JWKS: %w", err)
	}

	keyFunc := func(token *jwt.Token) (interface{}, error) {
		kid, ok := token.Header["kid"].(string)
		if !ok {
			return nil, errors.New("kid header not found")
		}

		keys, err := cache.Get(ctx, jwksURL)
		if err != nil {
			return nil, fmt.Errorf("failed to get keys from cache: %w", err)
		}

		key, found := keys.LookupKeyID(kid)
		if !found {
			return nil, fmt.Errorf("key with kid %s not found", kid)
		}

		var pubKey interface{}
		if err := key.Raw(&pubKey); err != nil {
			return nil, fmt.Errorf("failed to get raw public key: %w", err)
		}

		return pubKey, nil
	}

	return &Validator{
		keyFunc:    keyFunc,
		issuer:     issuerURL.String(),
		audience:   []string{audience},
	}, nil
}

// ValidateToken parses and validates a raw JWT string.
func (v *Validator) ValidateToken(tokenString string) (*CustomClaims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &CustomClaims{}, v.keyFunc,
		jwt.WithIssuer(v.issuer),
		jwt.WithAudience(v.audience[0]),
	)

	if err != nil {
		return nil, fmt.Errorf("failed to parse token: %w", err)
	}

	if !token.Valid {
		return nil, errors.New("token is invalid")
	}

	claims, ok := token.Claims.(*CustomClaims)
	if !ok {
		return nil, errors.New("failed to cast claims to CustomClaims")
	}

	return claims, nil
}
