
locals {
  controlpanel_dir = "../../static"
}

locals {
  controlpanel_endpoint = "control.rl.arigativa.ru"
}

resource "aws_s3_bucket" "controlpanel" {
  bucket = local.controlpanel_endpoint
  acl = "public-read"
  website {
    index_document = "index.html"
  }
}

resource "aws_s3_bucket_object" "controlpanel-assets" {
  for_each = fileset(local.controlpanel_dir, "**")
  bucket = aws_s3_bucket.controlpanel.bucket
  acl = "public-read"
  key = each.value
  source = "${local.controlpanel_dir}/${each.value}"
  etag = filemd5("${local.controlpanel_dir}/${each.value}")
  content_type = length(regexall("\\.html$", each.value)) > 0 ? "text/html" : null
}

resource "aws_route53_record" "controlpanel" {
  zone_id = data.aws_route53_zone.default.zone_id
  name    = "${local.controlpanel_endpoint}."
  type    = "CNAME"
  ttl     = "300"
  records = [aws_cloudfront_distribution.controlpanel.domain_name]
}

output "controlpanel-s3domain" {
  value = aws_s3_bucket.controlpanel.website_endpoint
}


locals {
  cf_origin = "origin-${local.controlpanel_endpoint}"
}

resource "aws_cloudfront_distribution" "controlpanel" {
  provider = aws.cloudfront

  enabled = true
  is_ipv6_enabled = true
  http_version = "http2"

  aliases = [local.controlpanel_endpoint]

  origin {
    origin_id = local.cf_origin
    domain_name = local.controlpanel_endpoint

    custom_origin_config {
      http_port = 80
      https_port = 443
      origin_protocol_policy = "http-only" // s3 serves only http
      origin_ssl_protocols = ["TLSv1.2"]
    }

  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  default_cache_behavior {
    allowed_methods = ["GET", "HEAD"]
    cached_methods = ["GET", "HEAD"]
    target_origin_id = local.cf_origin
    viewer_protocol_policy = "redirect-to-https"
    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }
  }

  viewer_certificate {
    acm_certificate_arn = aws_acm_certificate.rl-arigativa-ru.arn
    ssl_support_method = "sni-only"
    minimum_protocol_version = "TLSv1"
  }
}
