
locals {
  hud_dir = "../../hud/static"
}

resource "aws_s3_bucket_object" "hud-assets" {
  for_each = fileset(local.hud_dir, "**")
  bucket = aws_s3_bucket.hud.bucket
  acl = "public-read"
  key = each.value
  source = "${local.hud_dir}/${each.value}"
  etag = filemd5("${local.hud_dir}/${each.value}")
  content_type = length(regexall("\\.html$", each.value)) > 0 ? "text/html" : null
}

resource "aws_s3_bucket" "hud" {
  bucket = "live-hud"
  acl = "public-read"
  website {
    index_document = "index.html"
  }
}

output "hud_endpoint" {
  value = aws_s3_bucket.hud.website_endpoint
}
