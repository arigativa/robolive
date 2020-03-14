
locals {
  controlpanel_dir = "../../static"
}

resource "aws_s3_bucket" "controlpanel" {
  bucket = "controlpanel-ui"
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
  name    = "control.rl.arigativa.ru."
  type    = "CNAME"
  ttl     = "300"
  records = [aws_s3_bucket.controlpanel.website_endpoint]
}

output "controlpanel-s3domain" {
  value = aws_s3_bucket.controlpanel.website_endpoint
}