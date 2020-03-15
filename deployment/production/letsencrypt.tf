provider "acme" {
  server_url = "https://acme-v02.api.letsencrypt.org/directory"
}

resource "tls_private_key" "alex-acme" {
  algorithm = "RSA"
}

resource "acme_registration" "alex" {
  account_key_pem = tls_private_key.alex-acme.private_key_pem
  email_address   = "alex@arigativa.ru"
}

resource "acme_certificate" "rl-arigativa-ru" {
  account_key_pem = acme_registration.alex.account_key_pem
  common_name = "rl.arigativa.ru"
  subject_alternative_names = ["control.rl.arigativa.ru"]
  dns_challenge {
    provider = "route53"
    config = {
      AWS_ACCESS_KEY_ID     = "AKIA2HISUM5U7HWXCIHO"
      AWS_SECRET_ACCESS_KEY = "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"
      AWS_DEFAULT_REGION    = "eu-central-1"
    }
  }
}

resource "aws_acm_certificate" "rl-arigativa-ru" {
  provider = aws.cloudfront
  private_key = acme_certificate.rl-arigativa-ru.private_key_pem
  certificate_body = acme_certificate.rl-arigativa-ru.certificate_pem
  certificate_chain = "${acme_certificate.rl-arigativa-ru.certificate_pem}${acme_certificate.rl-arigativa-ru.issuer_pem}"
}
